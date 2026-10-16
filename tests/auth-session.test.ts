import assert from 'node:assert/strict';
import test from 'node:test';
import { Amplify } from '@aws-amplify/core';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { fetchTokenSession } from '../src/lib/auth-session';

test('token-only session reads never request AWS credentials and preserve refresh behavior', async (t) => {
  let credentialsRequested = 0;
  t.mock.method(Amplify.Auth, 'fetchAuthSession', () => {
    credentialsRequested++;
    throw new Error('Full AWS session must not be requested');
  });
  const tokens = { accessToken: { payload: { sub: 'customer' }, toString: () => 'access-token' } };
  const reads = t.mock.method(cognitoUserPoolsTokenProvider, 'getTokens');
  reads.mock.mockImplementation(async () => null);
  assert.equal((await fetchTokenSession()).tokens, undefined);
  reads.mock.mockImplementation(async () => tokens);
  assert.equal((await fetchTokenSession()).tokens, tokens);
  await fetchTokenSession({ forceRefresh: true });
  assert.deepEqual(reads.mock.calls.at(-1)?.arguments, [{ forceRefresh: true }]);
  // A subsequent sign-out must be observed rather than serving cached tokens.
  reads.mock.mockImplementation(async () => null);
  assert.equal((await fetchTokenSession()).tokens, undefined);
  reads.mock.mockImplementation(async () => { throw new Error('Refresh failed'); });
  await assert.rejects(fetchTokenSession(), /Refresh failed/);
  assert.equal(credentialsRequested, 0);
});
