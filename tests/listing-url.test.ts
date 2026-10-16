import assert from 'node:assert/strict';
import test from 'node:test';
import { listingPath, listingSlug, resolveListing, titleSlug } from '../src/lib/listing-url';
import type { Listing } from '../src/lib/catalog';
const product = { id: 'a1b2c3', publicId: '123456', title: 'Personalized Copper Bottle', published: true } as Listing;

test('product URLs combine a readable title and a unique stable identifier', () => {
  assert.equal(listingPath(product), '/listing/123456/personalized-copper-bottle');
  assert.equal(titleSlug('  Café & Copper — Bottle! '), 'cafe-copper-bottle');
  assert.equal(titleSlug('!!!'), 'product');
  const other = { ...product, id: 'a1b2c4', publicId: '123457' };
  assert.notEqual(listingPath(product), listingPath(other));
  assert.equal(resolveListing(other.publicId, [product, other]), other);
  assert.equal(resolveListing(product.publicId!, [product, other]), product);
});

test('lookup uses the unique number and rejects unknown or unpublished products', () => {
  assert.equal(resolveListing(product.id, [product]), product);
  assert.equal(resolveListing('missing', [product]), undefined);
  assert.equal(resolveListing(product.publicId!, [{ ...product, published: false }]), undefined);
});

test('Unicode titles and identifiers are safely encoded in URLs', () => {
  const item = { ...product, id: 'custom/id', publicId: undefined, title: 'हाथ का उपहार' };
  const segments = listingPath(item).split('/');
  assert.equal(segments.length, 4);
  assert.equal(decodeURIComponent(segments[2]), item.id);
  assert.equal(decodeURIComponent(segments[3]), listingSlug(item));
});

test('a title edit preserves lookup by public number', () => {
  const renamed = { ...product, title: 'New name' };
  assert.equal(resolveListing('123456', [renamed]), renamed);
  assert.equal(listingPath(renamed), '/listing/123456/new-name');
});
