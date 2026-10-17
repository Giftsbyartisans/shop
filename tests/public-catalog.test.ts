import assert from 'node:assert/strict';
import test from 'node:test';
import type { Listing } from '../src/lib/catalog';
const listings: Listing[] = [{ id: 'test-product', title: 'Test product', description: 'Test description', category: 'Test category', price: 20, image: 'https://example.com/product.webp', published: true }];
import { catalogWithNumbers, parsePublicCatalog } from '../src/lib/public-catalog';
test('public catalog accepts published listings and empty catalogs', () => {
  assert.deepEqual(parsePublicCatalog(listings), listings);
  assert.deepEqual(parsePublicCatalog([]), []);
});
test('invalid, draft, and unsafe snapshot entries are rejected', () => {
  assert.throws(() => parsePublicCatalog({}));
  assert.throws(() => parsePublicCatalog([{ ...listings[0], published: false }]));
  assert.throws(() => parsePublicCatalog([{ ...listings[0], image: 'javascript:alert(1)' }]));
});

test('legacy catalogs remain usable when the numbering backend is not deployed', async () => {
  const snapshot = [{ ...listings[0], publicId: undefined }];
  assert.equal(await catalogWithNumbers(snapshot, async () => { throw new Error('HTTP 404'); }), snapshot);
});
test('numbered snapshots need no fallback and legacy snapshots can be enriched', async () => {
  const snapshot = [{ ...listings[0], publicId: '123456' }];
  assert.equal(await catalogWithNumbers(snapshot, async () => { throw new Error('Must not fetch'); }), snapshot);
  assert.equal(await catalogWithNumbers(listings, async () => snapshot), snapshot);
});
test('missing catalogs still report failure instead of a successful empty sitemap', async () => {
  await assert.rejects(catalogWithNumbers(undefined, async () => { throw new Error('Unavailable'); }), /Unavailable/);
});

test('retired bundled products are omitted without discarding real products', () => {
  assert.deepEqual(parsePublicCatalog([...listings, { ...listings[0], id: 'retired', image: '/demo/gift-0.svg' }]), listings);
});
