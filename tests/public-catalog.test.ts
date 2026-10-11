import assert from 'node:assert/strict';
import test from 'node:test';
import { demoListings } from '../src/lib/catalog';
import { parsePublicCatalog } from '../src/lib/public-catalog';
test('public catalog accepts published listings and empty catalogs', () => {
  assert.deepEqual(parsePublicCatalog(demoListings), demoListings);
  assert.deepEqual(parsePublicCatalog([]), []);
});
test('invalid, draft, and unsafe snapshot entries are rejected', () => {
  assert.throws(() => parsePublicCatalog({}));
  assert.throws(() => parsePublicCatalog([{ ...demoListings[0], published: false }]));
  assert.throws(() => parsePublicCatalog([{ ...demoListings[0], image: 'javascript:alert(1)' }]));
});
