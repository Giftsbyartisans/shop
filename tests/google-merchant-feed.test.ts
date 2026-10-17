import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGoogleMerchantFeed } from '../src/lib/google-merchant-feed';
import { defaultContent } from '../src/lib/content';
import type { Listing } from '../src/lib/catalog';
const item: Listing = { id: 'stable-internal-id', publicId: '123456', title: 'Copper & brass bottle', description: '<p>Made by hand.</p>\nNew bottle.', price: 40, image: 's3:media/bottle/1600.webp', category: 'Home & living', published: true };

test('feed exports published products with stable IDs, matching URLs, prices, and public images', () => {
  const feed = buildGoogleMerchantFeed('https://giftsbyartisans.com/', [item, item, { ...item, id: 'draft', published: false }], defaultContent, 'https://cdn.example.com');
  assert.equal(feed.match(/<item>/g)?.length, 1);
  assert.ok(feed.includes('<g:id>stable-internal-id</g:id>'));
  assert.ok(feed.includes('https://giftsbyartisans.com/listing/123456/copper-brass-bottle'));
  assert.ok(feed.includes('<g:title>Copper &amp; brass bottle</g:title>'));
  assert.ok(feed.includes('<g:description>Made by hand. New bottle.</g:description>'));
  assert.ok(feed.includes('https://cdn.example.com/media/bottle/1600.webp'));
  assert.ok(feed.includes('<g:price>40.00 USD</g:price>'));
  assert.ok(feed.includes('<g:condition>new</g:condition>'));
  assert.ok(feed.includes('<g:identifier_exists>no</g:identifier_exists>'));
  assert.ok(!feed.includes('<g:gtin>'));
  assert.ok(!feed.includes('<g:mpn>'));
});

test('feed reflects explicit sale prices, shop discounts, and disabled ordering', () => {
  const feed = buildGoogleMerchantFeed('https://example.com', [{ ...item, salePrice: 25 }], { ...defaultContent, saleEnabled: true, salePercent: 20, buyNowEnabled: false }, 'https://cdn.example.com');
  assert.ok(feed.includes('<g:sale_price>25.00 USD</g:sale_price>'));
  assert.ok(feed.includes('<g:availability>out_of_stock</g:availability>'));
  const discounted = buildGoogleMerchantFeed('https://example.com', [item], { ...defaultContent, saleEnabled: true, salePercent: 20 }, 'https://cdn.example.com');
  assert.ok(discounted.includes('<g:sale_price>32.00 USD</g:sale_price>'));
});

test('gallery images are deduplicated and invalid published products cannot silently disappear', () => {
  const feed = buildGoogleMerchantFeed('https://example.com', [{ ...item, images: [item.image, item.image, 'https://example.com/extra.webp', 'https://example.com/extra.webp'] }], defaultContent, 'https://cdn.example.com');
  assert.equal(feed.match(/<g:additional_image_link>/g)?.length, 1);
  assert.throws(() => buildGoogleMerchantFeed('https://example.com', [item], defaultContent, ''), /public HTTPS image/);
  assert.throws(() => buildGoogleMerchantFeed('https://example.com', [{ ...item, price: 0 }], defaultContent, 'https://cdn.example.com'), /positive price/);
});
