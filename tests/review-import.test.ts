import test from 'node:test';
import assert from 'node:assert/strict';
import { importReviews, exportReviews } from '../src/lib/review-import';
const row = { reviewer: 'Customer', date_reviewed: '10/04/2026', star_rating: 4, message: 'Good quality.', order_id: 4143068550 };
test('imports Etsy reviews with editable fields and stable opaque IDs', async () => {
  const [review] = await importReviews(JSON.stringify([row]));
  assert.equal(review.name, 'Customer');
  assert.equal(review.dateReviewed, '2026-10-04');
  assert.equal(review.rating, 4);
  assert.ok(!JSON.stringify(review).includes(String(row.order_id)));
  const [changed] = await importReviews(JSON.stringify([{ ...row, message: 'Updated.' }]));
  assert.notEqual(changed.id, review.id);
});
test('export roundtrip preserves edits, dates and IDs', async () => {
  const reviews = await importReviews(JSON.stringify([row]));
  reviews[0].name = 'Edited'; reviews[0].rating = 5;
  assert.deepEqual(await importReviews(exportReviews(reviews)), reviews);
});
test('invalid rows, dates, duplicates and limits fail before changing reviews', async () => {
  for (const data of [[{ ...row, star_rating: 6 }], [{ ...row, message: '' }], [{ ...row, date_reviewed: '02/30/2026' }], [], Array.from({ length: 51 }, (_, order_id) => ({ ...row, order_id }))])
    await assert.rejects(importReviews(JSON.stringify(data)));
});

test('skips exact reviews but adds a different message', async () => {
  const existing = await importReviews(JSON.stringify([row]));
  assert.deepEqual(await importReviews(JSON.stringify([{ ...row, reviewer: ' customer ', order_id: 12 }]), existing), []);
  assert.equal((await importReviews(JSON.stringify([row, { ...row, message: 'Different', order_id: 12 }]))).length, 2);
  const different = await importReviews(JSON.stringify([{ ...row, message: 'Different' }]), existing);
  assert.equal(different.length, 1);
  assert.notEqual(different[0].id, existing[0].id);
  assert.equal((await importReviews(JSON.stringify([{ ...row, star_rating: 5 }]), existing)).length, 1);
  assert.equal((await importReviews(JSON.stringify([{ ...row, date_reviewed: '10/05/2026' }]), existing)).length, 1);
});
