import assert from 'node:assert/strict';
import test from 'node:test';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { parsePublicCatalog } from '../src/lib/public-catalog';
process.env.USER_POOL_ID = 'us-east-1_testpool';
process.env.USER_POOL_CLIENT_ID = 'testclient';
const event = { rawPath: '/storefront', requestContext: { http: { method: 'GET' } } } as APIGatewayProxyEventV2;

test('public fallback paginates published records and strips internal fields', async (t) => {
  let scans = 0;
  t.mock.method(DynamoDBClient.prototype, 'send', async (command: unknown) => {
    if (!(command instanceof ScanCommand)) return {};
    scans++;
    assert.deepEqual(command.input.ExclusiveStartKey, scans === 1 ? undefined : { id: { S: 'next' } });
    return {
      Items: [{ id: { S: `product-${scans}` }, title: { S: 'Handmade gift' }, description: { S: 'Made by artisans' }, category: { S: 'Gifts' }, image: { S: 'https://example.com/gift.webp' }, price: { N: '25' }, owner: { S: 'private-owner' }, _version: { N: '1' } }],
      ...(scans === 1 ? { LastEvaluatedKey: { id: { S: 'next' } } } : {}),
    };
  });
  const { handler } = await import('../amplify/functions/shop-api/handler');
  const response = await handler(event);
  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.equal(parsePublicCatalog(body.listings).length, 2);
  assert.equal(scans, 2);
  assert.equal(body.listings[0].owner, undefined);
  assert.equal(body.listings[0]._version, undefined);
  assert.ok(body.content.policies.length);
});

test('public fallback reports outages rather than an empty successful catalog', async (t) => {
  t.mock.method(DynamoDBClient.prototype, 'send', async () => { throw new Error('database unavailable'); });
  const { handler } = await import('../amplify/functions/shop-api/handler');
  const response = await handler(event);
  assert.equal(response.statusCode, 503);
  assert.equal(JSON.parse(response.body).error, 'Storefront data is temporarily unavailable.');
});
