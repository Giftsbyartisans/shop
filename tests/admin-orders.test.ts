import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesShipDate, orderUpdate } from '../src/lib/admin-orders';
test('fulfillment updates validate progress and calendar dates independently of payment', () => {
  assert.deepEqual(orderUpdate({progress:'completed',shipBy:'2026-10-20'}), {progress:'completed',shipBy:'2026-10-20'});
  assert.deepEqual(orderUpdate({progress:'new',shipBy:null}), {progress:'new',shipBy:null});
  for (const input of [{progress:'paid'}, {progress:'new',shipBy:'2026-02-30'}, {progress:'new',shipBy:'tomorrow'}, null]) assert.throws(() => orderUpdate(input));
});
test('ship filters handle missing dates and month boundaries', () => {
  assert.equal(matchesShipDate(null,'none','2026-10-31'),true);
  assert.equal(matchesShipDate(null,'today','2026-10-31'),false);
  assert.equal(matchesShipDate('2026-10-30','overdue','2026-10-31'),true);
  assert.equal(matchesShipDate('2026-10-31','today','2026-10-31'),true);
  assert.equal(matchesShipDate('2026-11-01','tomorrow','2026-10-31'),true);
  assert.equal(matchesShipDate('2026-11-07','week','2026-10-31'),true);
  assert.equal(matchesShipDate('2026-11-08','week','2026-10-31'),false);
  assert.equal(matchesShipDate('2026-10-30','week','2026-10-31'),false);
});
