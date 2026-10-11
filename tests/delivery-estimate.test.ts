import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryEstimate } from '../src/lib/delivery-estimate';
test('delivery uses 10–15 calendar days with compact ranges', () => {
  assert.equal(deliveryEstimate(new Date(2026, 9, 11)), 'Oct 21–26');
});
test('delivery formats month and year boundaries', () => {
  assert.equal(deliveryEstimate(new Date(2026, 9, 20)), 'Oct 30–Nov 4');
  assert.equal(deliveryEstimate(new Date(2026, 11, 20)), 'Dec 30–Jan 4');
});
