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
  image: "/demo/gift-0.svg",
  published: false,
};
test("sale price overrides discount only while the store sale is enabled", () => {
  assert.equal(listingPrice({ ...listing, salePrice: 40 }, true, 20), 40);
  assert.equal(listingPrice({ ...listing, salePrice: 40 }, false, 20), 100);
  assert.equal(listingPrice(listing, true, 20), 80);
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
        images: [listing.image, "/demo/gift-1.svg"],
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
