import assert from "node:assert/strict";
import test from "node:test";
import {
  listingPrice,
  validateListingMedia,
  type Listing,
} from "../src/lib/catalog";
import { importListings } from "../src/lib/listing-import";
const listing: Listing = {
  id: "gift",
  title: "Gift",
  description: "Gift",
  category: "Gifts",
  price: 100,
  image: "https://example.com/product.webp",
  published: false,
};
test("saved sale price applies independently of the storewide sale", () => {
  assert.equal(listingPrice({ ...listing, salePrice: 40 }, true, 20), 40);
  assert.equal(listingPrice({ ...listing, salePrice: 40 }, false, 20), 40);
  assert.equal(listingPrice(listing, true, 20), 80);
  assert.equal(listingPrice(listing, false, 20), 100);
  assert.equal(listingPrice({ ...listing, salePrice: 0 }, false, 20), 0);
  assert.equal(listingPrice({ ...listing, salePrice: 100 }, true, 20), 100);
});
test("sale and media limits are enforced", () => {
  assert.throws(
    () => validateListingMedia({ ...listing, salePrice: 101 }),
    /Sale price/,
  );
  assert.throws(
    () =>
      validateListingMedia({
        ...listing,
        images: Array(11).fill(listing.image),
      }),
    /10 photos/,
  );
  assert.throws(
    () =>
      validateListingMedia({
        ...listing,
        videos: Array(3).fill("s3:media/video.mp4"),
      }),
    /2 videos/,
  );
  assert.throws(
    () => validateListingMedia({ ...listing, videos: ["javascript:alert(1)"] }),
    /HTTPS/,
  );
});
test("catalog imports preserve galleries and optional sale prices", () => {
  const [item] = importListings(
    JSON.stringify([
      {
        ...listing,
        images: [listing.image, "https://example.com/product-2.webp"],
        videos: ["s3:media/video.mp4"],
        salePrice: 50,
      },
    ]),
    "catalog.json",
  );
  assert.equal(item.images?.length, 2);
  assert.equal(item.videos?.length, 1);
  assert.equal(item.salePrice, 50);
});

test('drafts can start without a photo but published listings require real media', () => {
  assert.doesNotThrow(() => validateListingMedia({ ...listing, image: '' }));
  assert.throws(() => validateListingMedia({ ...listing, published: true, image: '' }), /HTTPS/);
  assert.throws(() => validateListingMedia({ ...listing, image: '/demo/gift-0.svg' }), /HTTPS/);
  const [draft] = importListings(JSON.stringify([{ title: 'Real product', description: 'Description', price: 10 }]), 'catalog.json');
  assert.equal(draft.image, '');
  assert.equal(draft.published, false);
});
