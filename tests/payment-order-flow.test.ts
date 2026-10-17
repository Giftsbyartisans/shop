import assert from 'node:assert/strict';
import test from 'node:test';
import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand, type AttributeValue } from '@aws-sdk/client-dynamodb';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { defaultContent } from '../src/lib/content';
import { encryptPayPalSettings } from '../src/lib/paypal-encryption';

Object.assign(process.env, { USER_POOL_ID: 'us-east-1_testpool', USER_POOL_CLIENT_ID: 'testclient', PAYMENT_ATTEMPTS_TABLE: 'attempts', ORDER_TABLE: 'orders', PAYMENT_SETTINGS_TABLE: 'payment-settings', SHOP_SETTINGS_TABLE: 'settings', LISTING_TABLE: 'listings', PAYPAL_MODE: 'sandbox', PAYPAL_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('hex') });

test('failed payment creation and capture never write customer orders; successful capture writes one paid order', async (t) => {
  const tables = new Map<string, Map<string, Record<string, AttributeValue>>>([['attempts', new Map()], ['orders', new Map()]]);
  let failOrderWrite = false;
  const encrypted = encryptPayPalSettings(JSON.stringify({ sandbox: { clientId: 'client', secret: 'secret' }, live: { clientId: '', secret: '' } }), process.env.PAYPAL_ENCRYPTION_KEY);
  t.mock.method(CognitoIdentityProviderClient.prototype, 'send', async () => ({ Users: [] }));
  t.mock.method(DynamoDBClient.prototype, 'send', async (command: unknown) => {
    if (command instanceof GetItemCommand) {
      const table = command.input.TableName!, id = command.input.Key!.id.S!;
      if (table === 'payment-settings') return { Item: { encryptedContent: { S: encrypted } } };
      if (table === 'settings') return { Item: { content: { S: JSON.stringify(defaultContent) } } };
      if (table === 'listings') return { Item: { id: { S: 'product' }, title: { S: 'Product' }, price: { N: '10' }, image: { S: 'https://example.com/photo.webp' } } };
      return { Item: tables.get(table)?.get(id) };
    }
    if (command instanceof PutItemCommand) {
      const table = tables.get(command.input.TableName!)!;
      assert.ok(table, 'Only payment-attempt and confirmed-order tables may be written');
      if (command.input.TableName === 'orders' && failOrderWrite) { failOrderWrite = false; throw new Error('Temporary database outage'); }
      table.set(command.input.Item!.id.S!, command.input.Item!);
      if (command.input.TableName === 'orders') {
        assert.equal(command.input.Item!.status.S, 'paid');
        assert.equal(command.input.Item!.paypalCaptureId.S, 'CAPTURE123');
      }
      return {};
    }
    assert.ok(command instanceof UpdateItemCommand);
    const table = tables.get(command.input.TableName!)!;
    const row = table.get(command.input.Key!.id.S!)!;
    row.paypalOrderId = command.input.ExpressionAttributeValues![':paypal'];
    return {};
  });
  let failCreate = true, failCapture = true, captures = 0, paymentCompleted = false;
  const completedPayment = () => ({ id: 'PAYPAL123', status: 'COMPLETED', purchase_units: [{ custom_id: [...tables.get('attempts')!.keys()][0], payments: { captures: [{ id: 'CAPTURE123', status: 'COMPLETED', amount: { value: '10.00', currency_code: 'USD' } }] } }] });
  t.mock.method(globalThis, 'fetch', async (url: unknown) => {
    const path = String(url);
    if (path.endsWith('/token')) return Response.json({ access_token: 'test-token' });
    if (path.endsWith('/v2/checkout/orders')) return failCreate ? Response.json({}, { status: 500 }) : Response.json({ id: 'PAYPAL123', status: 'CREATED' });
    if (!path.endsWith('/capture')) return Response.json(paymentCompleted ? completedPayment() : { id: 'PAYPAL123', status: 'APPROVED' });
    captures++;
    if (failCapture) return Response.json({}, { status: 422 });
    paymentCompleted = true;
    return Response.json(completedPayment());
  });
  const { handler } = await import('../amplify/functions/shop-api/handler');
  const input = { cartId: 'c7420300-90a4-4eea-a443-fbc8b20b11dd', requestId: 'a7420300-90a4-4eea-a443-fbc8b20b11dd', email: 'guest@example.com', expectedTotal: 10, items: [{ id: 'product', quantity: 1 }], guestAddress: { recipient: 'Customer', line1: 'Street', city: 'City', country: 'US', postalCode: '12345', phone: '1234567890' } };
  const event = (path: string) => ({ rawPath: path, headers: {}, body: JSON.stringify({ ...input, orderID: 'PAYPAL123' }), requestContext: { http: { method: 'POST' } } }) as APIGatewayProxyEventV2;
  assert.equal((await handler(event('/paypal/create'))).statusCode, 502);
  assert.equal(tables.get('orders')!.size, 0);
  assert.equal(tables.get('attempts')!.size, 1);
  failCreate = false;
  assert.equal((await handler(event('/paypal/create'))).statusCode, 200);
  assert.equal(tables.get('orders')!.size, 0);
  assert.equal((await handler(event('/paypal/capture'))).statusCode, 502);
  assert.equal(tables.get('orders')!.size, 0);
  failCapture = false;
  failOrderWrite = true;
  assert.equal((await handler(event('/paypal/capture'))).statusCode, 503);
  assert.equal(tables.get('orders')!.size, 0);
  const capturesBeforeRecovery = captures;
  assert.equal(JSON.parse((await handler(event('/paypal/capture'))).body).paid, true);
  assert.equal(tables.get('orders')!.size, 1);
  assert.equal(captures, capturesBeforeRecovery);
  const previousCaptures = captures;
  assert.equal(JSON.parse((await handler(event('/paypal/capture'))).body).paid, true);
  assert.equal(captures, previousCaptures);
  assert.equal(tables.get('orders')!.size, 1);
});
