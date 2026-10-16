import assert from 'node:assert/strict';
import test from 'node:test';
import { Amplify } from '@aws-amplify/core';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { accountCart, accountFavorite } from '../src/lib/account-shopping-api';

test('cart and favorite operations send JWTs without loading AWS credentials', async (t) => {
  t.mock.method(Amplify.Auth, 'fetchAuthSession', async () => { throw new Error('AWS credentials must not be requested'); });
  let token: string | null = 'first-session';
  t.mock.method(cognitoUserPoolsTokenProvider, 'getTokens', async () => token ? { accessToken: { toString: () => token } } : null);
  const calls: { query: string; variables: Record<string, unknown> }[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    assert.equal((init.headers as Record<string, string>).Authorization, token);
    const body = JSON.parse(init.body as string);
    calls.push(body);
    const field = body.query.match(/\{ (\w+)\(/)[1];
    return Response.json({ data: { [field]: field === 'listCustomerFavorites' ? { items: [null, { id: 'favorite', listingId: 'product' }], nextToken: 'page-2' } : { id: 'record' } } });
  });
  await accountCart.get({ id: 'customer' });
  await accountCart.create({ id: 'customer', cartId: 'cart', items: '[]' });
  await accountCart.update({ id: 'customer', cartId: 'cart', items: '[]' });
  token = 'second-session';
  const favorites = await accountFavorite.list({ limit: 100, nextToken: 'page-1' });
  assert.deepEqual(favorites.data, [{ id: 'favorite', listingId: 'product' }]);
  assert.equal(favorites.nextToken, 'page-2');
  assert.deepEqual(calls[3].variables, { limit: 100, nextToken: 'page-1' });
  await accountFavorite.get({ id: 'favorite' });
  await accountFavorite.create({ id: 'favorite', listingId: 'product' });
  await accountFavorite.delete({ id: 'favorite' });
  assert.equal(calls.length, 7);
  token = null;
  await assert.rejects(accountCart.get({ id: 'customer' }), /Sign in/);
  assert.equal(calls.length, 7);
});

test('failed GraphQL responses cannot update shopping state as successful operations', async (t) => {
  t.mock.method(cognitoUserPoolsTokenProvider, 'getTokens', async () => ({ accessToken: { toString: () => 'token' } }));
  t.mock.method(globalThis, 'fetch', async () => Response.json({ data: { getCustomerCart: null }, errors: [{ message: 'Unauthorized' }] }));
  await assert.rejects(accountCart.get({ id: 'customer' }), /Could not sync/);
});
