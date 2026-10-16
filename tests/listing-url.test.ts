import assert from 'node:assert/strict';
import test from 'node:test';
import { listingPath, listingSlug, resolveListing, titleSlug } from '../src/lib/listing-url';
import type { Listing } from '../src/lib/catalog';
const product = { id: 'a1b2c3', publicId: '123456', title: 'Personalized Copper Bottle', published: true } as Listing;

test('product URLs combine a readable title and a unique stable identifier', () => {
  assert.equal(listingPath(product), '/listing/personalized-copper-bottle-123456');
  assert.equal(titleSlug('  Café & Copper — Bottle! '), 'cafe-copper-bottle');
  assert.equal(titleSlug('!!!'), 'product');
  const other = { ...product, id: 'a1b2c4', publicId: '123457' };
  assert.notEqual(listingPath(product), listingPath(other));
  assert.equal(resolveListing(listingSlug(other), [product, other]), other);
  assert.equal(resolveListing(listingSlug(product), [product, other]), product);
});

test('unknown, unpublished, and old ID-only URLs do not resolve', () => {
  assert.equal(resolveListing(product.id, [product]), undefined);
  assert.equal(resolveListing('missing', [product]), undefined);
  assert.equal(resolveListing(listingSlug(product), [{ ...product, published: false }]), undefined);
});

test('Unicode titles and identifiers are safely encoded in URLs', () => {
  const item = { ...product, id: 'custom/id', publicId: undefined, title: 'हाथ का उपहार' };
  assert.equal(decodeURIComponent(listingPath(item).slice('/listing/'.length)), listingSlug(item));
  assert.ok(!listingPath(item).slice('/listing/'.length).includes('/'));
});
