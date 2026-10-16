import assert from 'node:assert/strict';
import test from 'node:test';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { accountCart } from '../src/lib/account-shopping-api';
import { addCartItem } from '../src/lib/shopping';

const tick = () => new Promise(resolve => setImmediate(resolve));
test('adds queue during initialization, display immediately during saving, and roll back failed saves', async (t) => {
  const events = new EventTarget();
  const storage = new Map<string, string>();
  const globals = { window: events, localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  t.mock.method(cognitoUserPoolsTokenProvider, 'getTokens', async () => ({
    accessToken: { payload: { sub: 'customer' }, toString: () => 'token' },
    idToken: { payload: { sub: 'customer', 'cognito:username': 'customer' } },
  }));
  let finishRead!: (value: { data: { id: string; cartId: string; items: string } }) => void;
  t.mock.method(accountCart, 'get', () => new Promise(resolve => { finishRead = resolve; }));
  const saves: { resolve: (value: { data: { id: string; items: string } }) => void; reject: (error: Error) => void }[] = [];
  t.mock.method(accountCart, 'update', () => new Promise((resolve, reject) => { saves.push({ resolve, reject }); }));
  const { subscribeCart, updateCart, cartSnapshot } = await import('../src/lib/cart-store');
  const unsubscribe = subscribeCart(() => {});
  t.after(unsubscribe);
  const add = updateCart(current => addCartItem(current, 'first', '', 1));
  await tick();
  assert.equal(saves.length, 0);
  finishRead({ data: { id: 'customer', cartId: '12345678-1234-1234-1234-123456789abc', items: '[]' } });
  await tick();
  assert.equal(saves.length, 1);
  assert.equal(cartSnapshot().items[0].id, 'first');
  assert.equal(cartSnapshot().saving, true);
  saves[0].resolve({ data: { id: 'customer', items: '[]' } });
  await add;
  assert.equal(cartSnapshot().saving, false);

  const failed = updateCart(current => addCartItem(current, 'second', '', 1));
  const rejection = assert.rejects(failed, /Save failed/);
  await tick();
  assert.equal(cartSnapshot().items.length, 2);
  assert.equal(cartSnapshot().saving, true);
  saves[1].reject(new Error('Save failed'));
  await rejection;
  assert.deepEqual(cartSnapshot().items.map(item => item.id), ['first']);
  assert.equal(cartSnapshot().saving, false);
});
