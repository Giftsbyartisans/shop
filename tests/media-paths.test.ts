import assert from 'node:assert/strict';
import test from 'node:test';
import { mediaAssetKey, mediaSlug, mediaUploadPrefix } from '../src/lib/media-paths';
import { cleanupListingMedia } from '../src/lib/listing-media-cleanup';
const id = '12345678-1234-1234-1234-123456789abc';
test('uploads have descriptive, safe names and unique per-upload folders', () => {
  const path = mediaUploadPrefix({ kind: 'listing-images', name: 'Copper Gift Box', entityId: 'product-42' }, 'Front View.JPG', id);
  assert.equal(path, `media/listing-images/copper-gift-box-product-42/front-view--${id}`);
  assert.equal(mediaSlug('../../Crème & Gifts'), 'creme-gifts');
  assert.equal(mediaSlug(''), 'untitled');
  assert.throws(() => mediaUploadPrefix({ kind: 'banners', name: 'hero' }, 'hero.jpg', '../'));
});
test('legacy and named paths group only one uploaded asset', () => {
  const folder = mediaUploadPrefix({ kind: 'banners', name: 'Summer' }, 'Hero.png', id) + '/';
  assert.equal(mediaAssetKey(folder + '1600.webp'), folder);
  assert.equal(mediaAssetKey(`media/${id}/320.webp`), `media/${id}/`);
  assert.equal(mediaAssetKey('media/banners/summer/'), 'media/banners/summer/');
  assert.equal(mediaAssetKey('media/legacy.jpg'), 'media/legacy.jpg');
});
test('named folder cleanup removes originals and variants and protects shared uploads', async () => {
  const folder = mediaUploadPrefix({ kind: 'listing-images', name: 'Copper' }, 'Photo.jpg', id) + '/';
  const deleted: string[] = [];
  const storage = {
    list: async (prefix: string) => [prefix + 'original.jpg', prefix + '320.webp', prefix + '1600.webp'],
    remove: async (path: string) => { deleted.push(path); },
  };
  await cleanupListingMedia(`s3:${folder}1600.webp`, { logo: `s3:${folder}320.webp` }, storage);
  assert.equal(deleted.length, 0);
  await cleanupListingMedia(`s3:${folder}1600.webp`, [], storage);
  assert.equal(deleted.length, 3);
});
