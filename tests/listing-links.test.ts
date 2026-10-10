import assert from "node:assert/strict";
import test from "node:test";
import { validateListingLinks } from "../src/lib/catalog";
import { importListings } from "../src/lib/listing-import";

test("listings may have neither, one, or both platform links", () => {
  assert.doesNotThrow(() => validateListingLinks({}));
  assert.doesNotThrow(() =>
    validateListingLinks({ etsyUrl: "https://www.etsy.com/listing/123" }),
  );
  assert.doesNotThrow(() =>
    validateListingLinks({
      etsyUrl: "https://www.etsy.com/listing/123",
      pinterestUrl: "https://www.pinterest.com/pin/123/",
    }),
  );
});
test("platform links reject unsafe protocols and unrelated domains", () => {
  assert.throws(
    () => validateListingLinks({ etsyUrl: "javascript:alert(1)" }),
    /Etsy/,
  );
  assert.throws(
    () => validateListingLinks({ etsyUrl: "https://etsy.com.example.org" }),
    /Etsy/,
  );
  assert.throws(
    () =>
      validateListingLinks({ pinterestUrl: "http://pinterest.com/pin/123" }),
    /Pinterest/,
  );
});
test("listing imports retain platform URLs", () => {
  const [item] = importListings(
    JSON.stringify([
      {
        id: "gift",
        title: "Gift",
        description: "Gift",
        price: 10,
        etsyUrl: "https://www.etsy.com/listing/123",
        pinterestUrl: "https://www.pinterest.com/pin/123/",
      },
    ]),
    "listings.json",
  );
  assert.equal(item.etsyUrl, "https://www.etsy.com/listing/123");
  assert.equal(item.pinterestUrl, "https://www.pinterest.com/pin/123/");
});
