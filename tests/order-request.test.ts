import assert from 'node:assert/strict';
import test from 'node:test';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { loadOrders } from '../src/lib/customer-records';

test('overlapping order loads share a request and later loads remain fresh', async (t) => {
  let token = 'customer-a';
  t.mock.method(cognitoUserPoolsTokenProvider, 'getTokens', async () => ({ accessToken: { toString: () => token } }));
  const requests: Array<{ resolve: (response: Response) => void }> = [];
  t.mock.method(globalThis, 'fetch', () => new Promise<Response>(resolve => { requests.push({ resolve }); }));
  const tick = () => new Promise(resolve => setImmediate(resolve));
  const first = loadOrders();
  const second = loadOrders();
  await tick();
  assert.equal(requests.length, 1);
  requests[0].resolve(Response.json({ orders: [] }));
  assert.deepEqual(await Promise.all([first, second]), [[], []]);

  const fresh = loadOrders();
  await tick();
  assert.equal(requests.length, 2);
  token = 'customer-b';
  const otherCustomer = loadOrders();
  await tick();
  assert.equal(requests.length, 3);
  requests[1].resolve(Response.json({ error: 'Temporary failure' }, { status: 503 }));
  await assert.rejects(fresh, /Temporary failure/);
  requests[2].resolve(Response.json({ orders: [] }));
  await otherCustomer;

  token = 'customer-a';
  const retry = loadOrders();
  await tick();
  assert.equal(requests.length, 4);
  requests[3].resolve(Response.json({ orders: [] }));
  await retry;
});
