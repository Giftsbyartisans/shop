import test from 'node:test';
import assert from 'node:assert/strict';
import { copyEtsyImages, etsyUploadId, isEtsyImage } from '../src/lib/etsy-image-import';
import { downloadEtsyImage } from '../src/lib/download-etsy-image';
import type { Listing } from '../src/lib/catalog';
const photo = 'https://i.etsystatic.com/123/photo.jpg';
const listing: Listing = { id: '123', title: 'Gift', description: 'Gift', category: 'Gifts', price: 20, published: true, image: photo, images: [photo], etsyUrl: 'https://www.etsy.com/listing/123' };
test('copies primary and gallery once and retains Etsy link', async () => {
  let calls = 0;
  const result = await copyEtsyImages([listing], async () => { calls++; return 's3:media/photo/1600.webp'; }, () => {});
  assert.equal(calls, 1);
  assert.equal(result.listings[0].image, result.listings[0].images?.[0]);
  assert.equal(result.listings[0].etsyUrl, listing.etsyUrl);
  assert.equal(result.listings[0].published, true);
});
test('failed photo makes listing draft while successful copies remain', async () => {
  const second = 'https://i.etsystatic.com/123/second.jpg';
  const result = await copyEtsyImages([{ ...listing, images: [photo, second] }], async source => {
    if (source === second) throw new Error('Download failed');
    return 's3:media/photo/1600.webp';
  }, () => {});
  assert.equal(result.listings[0].published, false);
  assert.equal(result.listings[0].image, 's3:media/photo/1600.webp');
  assert.equal(result.listings[0].images?.[1], second);
  assert.match(result.warnings[0], /Download failed/);
});
test('rejects arbitrary origins, credentials and non HTTPS', () => {
  for (const value of ['https://localhost/a', 'http://i.etsystatic.com/a', 'https://i.etsystatic.com.evil.com/a', 'https://user@i.etsystatic.com/a']) assert.equal(isEtsyImage(value), false);
  assert.equal(isEtsyImage(photo), true);
});
test('upload IDs are stable and isolated per source and listing', async () => {
  assert.equal(await etsyUploadId('123', photo), await etsyUploadId('123', photo));
  assert.notEqual(await etsyUploadId('123', photo), await etsyUploadId('456', photo));
});
test('download checks bytes and rejects oversized or non image responses', async () => {
  const mock = (response: Response) => (async () => response) as typeof fetch;
  const blob = await downloadEtsyImage(photo, mock(new Response(new Uint8Array([255,216,255,0]))));
  assert.equal(blob.type, 'image/jpeg');
  await assert.rejects(downloadEtsyImage(photo, mock(new Response('not an image'))), /must be/);
  await assert.rejects(downloadEtsyImage(photo, mock(new Response('x', { headers: { 'Content-Length': '9000000' } }))), /exceeds/);
  let called = false;
  await assert.rejects(downloadEtsyImage('https://localhost/image', (async () => { called = true; return new Response(); }) as typeof fetch));
  assert.equal(called, false);
});
