import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newChallenge, digest, orderPreview, publicOrder } from '../amplify/functions/shop-api/order-verification';
test('email preview excludes personal details and private tracking credentials', () => {
  const order = { orderNumber: 'GBA-123', createdAt: '2026-10-14', status: 'pending', email: 'a@example.com', shippingAddress: 'private', items: 'private', trackingNumber: 'private', owner: 'private', requestFingerprint: 'private' };
  assert.deepEqual(orderPreview(order), { orderNumber: 'GBA-123', createdAt: '2026-10-14', status: 'pending' });
  assert.equal('owner' in publicOrder(order), false);
  assert.equal('requestFingerprint' in publicOrder(order), false);
});
test('verification challenges store salted hashes, expire in ten minutes, and rotate', () => {
  const first = newChallenge('a@example.com', 1000), second = newChallenge('a@example.com', 1000);
  assert.match(first.code, /^\d{6}$/);
  assert.equal(first.record.expiresAt, 1600);
  assert.equal(first.record.codeHash, digest(`${first.token}:${first.code}`));
  assert.notEqual(first.token, second.token);
  assert.equal('code' in first.record, false);
});
