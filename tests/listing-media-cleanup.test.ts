import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanupListingMedia } from '../src/lib/listing-media-cleanup';

const folder = 'media/12345678-1234-1234-1234-123456789abc/';
test('deletion includes original, every variant, and legacy photos and videos once', async () => {
  const removed: string[] = [];
  const assets = ['original.jpg', '320.webp', '640.webp', '960.webp', '1600.webp'].map(name => folder + name);
  await cleanupListingMedia({ image: `s3:${folder}1600.webp`, images: [`s3:${folder}1600.webp`, 's3:media/old.jpg'], videos: ['s3:media/video.mp4'] }, [], {
    list: async prefix => { assert.equal(prefix, folder); return assets; },
    remove: async path => { removed.push(path); },
  });
  assert.deepEqual(removed, [...assets, 'media/old.jpg', 'media/video.mp4']);
});
test('shared folders and website media are preserved even when a different variant is referenced', async () => {
  await cleanupListingMedia([`s3:${folder}1600.webp`, 's3:media/banner.jpg'], [{ image: `s3:${folder}320.webp` }, { banners: [{ image: 's3:media/banner.jpg' }] }], {
    list: async () => { assert.fail('shared folder must not be listed'); },
    remove: async () => { assert.fail('shared asset must not be removed'); },
  });
});
test('external URLs, demo assets, private paths and unsafe keys are never deleted', async () => {
  await cleanupListingMedia(['https://example.com/photo.jpg', '/demo/gift.svg', 's3:uploads/user/private.jpg', 's3:media/../secret'], [], {
    list: async () => { assert.fail(); }, remove: async () => { assert.fail(); },
  });
});
test('storage failures propagate to prevent database deletion and permit retry', async () => {
  const failure = new Error('S3 denied');
  await assert.rejects(cleanupListingMedia('s3:media/photo.jpg', [], {
    list: async () => [], remove: async () => { throw failure; },
  }), failure);
});
test('folder listing cannot cause deletion outside the owned folder', async () => {
  const removed: string[] = [];
  await cleanupListingMedia(`s3:${folder}1600.webp`, [], {
    list: async () => [folder + 'original.png', 'uploads/private.jpg', 'media/other.jpg'],
    remove: async path => { removed.push(path); },
  });
  assert.deepEqual(removed, [folder + 'original.png']);
});

test('removed banners delete original and variants while retained logo and listing assets are protected', async () => {
  const other = 'media/87654321-4321-4321-4321-cba987654321/';
  const deleted: string[] = [];
  await cleanupListingMedia([`s3:${folder}1600.webp`, `s3:${other}1600.webp`, 's3:media/category.jpg'], [
    { logo: `s3:${other}320.webp`, categories: [{ image: 's3:media/category.jpg' }] },
    { images: [`s3:${other}960.webp`] },
  ], {
    list: async prefix => {
      assert.equal(prefix, folder);
      return ['original.jpg', '320.webp', '640.webp', '960.webp', '1600.webp'].map(name => prefix + name);
    },
    remove: async path => { deleted.push(path); },
  });
  assert.equal(deleted.length, 5);
  assert.ok(deleted.every(path => path.startsWith(folder)));
});
