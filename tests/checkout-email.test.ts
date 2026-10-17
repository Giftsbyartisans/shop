import assert from 'node:assert/strict';
import test from 'node:test';
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
process.env.USER_POOL_ID = 'us-east-1_testpool';
process.env.USER_POOL_CLIENT_ID = 'testclient';
const event = (email: string, path = '/checkout/email') => ({ rawPath: path, headers: {}, body: JSON.stringify({ email }), requestContext: { http: { method: 'POST' } } }) as APIGatewayProxyEventV2;

test('registered checkout emails return only a registration flag and use an exact normalized filter', async (t) => {
  t.mock.method(CognitoIdentityProviderClient.prototype, 'send', async (command: unknown) => {
    assert.ok(command instanceof ListUsersCommand);
    assert.equal(command.input.Filter, 'email = "customer@example.com"');
    assert.equal(command.input.Limit, 1);
    assert.equal(command.input.UserPoolId, 'us-east-1_testpool');
    return { Users: [{ Username: 'private-id', Attributes: [{ Name: 'email', Value: 'customer@example.com' }] }] };
  });
  const { handler } = await import('../amplify/functions/shop-api/handler');
  const response = await handler(event(' Customer@Example.com '));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { registered: true });
  assert.equal(response.headers['cache-control'], 'no-store');
});

test('unregistered guest emails can continue; invalid emails never query Cognito', async (t) => {
  let lookups = 0;
  t.mock.method(CognitoIdentityProviderClient.prototype, 'send', async () => { lookups++; return { Users: [] }; });
  const { handler } = await import('../amplify/functions/shop-api/handler');
  assert.deepEqual(JSON.parse((await handler(event('new@example.com'))).body), { registered: false });
  assert.equal((await handler(event('invalid'))).statusCode, 400);
  assert.equal(lookups, 1);
});

test('guest PayPal creation rejects registered emails before creating an order', async (t) => {
  t.mock.method(CognitoIdentityProviderClient.prototype, 'send', async () => ({ Users: [{ Username: 'existing-account' }] }));
  const { handler } = await import('../amplify/functions/shop-api/handler');
  const response = await handler(event('customer@example.com', '/paypal/create'));
  assert.equal(response.statusCode, 409);
  assert.match(JSON.parse(response.body).error, /Sign in or use a different email/);
});

test('email service failures return a retryable error rather than treating the address as new', async (t) => {
  t.mock.method(CognitoIdentityProviderClient.prototype, 'send', async () => { throw new Error('Service unavailable'); });
  const { handler } = await import('../amplify/functions/shop-api/handler');
  assert.equal((await handler(event('customer@example.com'))).statusCode, 503);
});
