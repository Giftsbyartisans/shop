import assert from 'node:assert/strict';
import test from 'node:test';
import { cdnImageUrl, cdnImageVariantUrl, imageSrcSet } from '../src/lib/image-delivery';

const cdn = 'https://example.cloudfront.net';
test('only public storefront media uses CDN; missing output preserves fallback', () => {
  assert.equal(cdnImageUrl('s3:media/photo.jpg', cdn), `${cdn}/media/photo.jpg`);
  assert.equal(cdnImageUrl('s3:uploads/user/private.jpg', cdn), undefined);
  assert.equal(cdnImageUrl('/demo/gift.svg', cdn), undefined);
  assert.equal(cdnImageUrl('s3:media/photo.jpg', ''), undefined);
});
test('variants advertise all prepared sizes without inventing variants for legacy files', () => {
  assert.equal(imageSrcSet('s3:media/id/1600.webp', cdn), [320, 640, 960, 1600].map(width => `${cdn}/media/id/${width}.webp ${width}w`).join(', '));
  assert.equal(imageSrcSet('s3:media/legacy.jpg', cdn), undefined);
  assert.equal(imageSrcSet('s3:media/id/1600.webp', ''), undefined);
});

test('standalone icons select small CDN variants and legacy images retain their paths', () => {
  assert.equal(cdnImageVariantUrl('s3:media/id/1600.webp', 64, cdn), `${cdn}/media/id/320.webp`);
  assert.equal(cdnImageVariantUrl('s3:media/id/1600.webp', 500, cdn), `${cdn}/media/id/640.webp`);
  assert.equal(cdnImageVariantUrl('s3:media/id/1600.webp', 2000, cdn), `${cdn}/media/id/1600.webp`);
  assert.equal(cdnImageVariantUrl('s3:media/legacy.png', 64, cdn), `${cdn}/media/legacy.png`);
  assert.equal(cdnImageVariantUrl('s3:uploads/private.png', 64, cdn), undefined);
});
