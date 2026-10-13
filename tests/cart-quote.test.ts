import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateCartQuote } from "../src/lib/cart-quote";
import { defaultContent } from "../src/lib/content";
import type { Listing } from "../src/lib/catalog";
const product = { id: "p", price: 10, published: true, personalizationMode: "custom", personalizationPrice: 2 } as Listing;
test("server quote applies quantities and discount without discounting personalization", () => {
  const quote = calculateCartQuote([{ id: "p", quantity: 3, personalization: "Name" }], [product], { ...defaultContent, saleEnabled: true, salePercent: 20 });
  assert.equal(quote.subtotal, 36); assert.equal(quote.discount, 6); assert.equal(quote.total, 30); assert.equal(quote.shipping, 0);
});
test("explicit sale prices override shop sales and cents round before quantity", () => {
  const quote = calculateCartQuote([{ id: "p", quantity: 2 }], [{ ...product, price: 10.99, salePrice: 8.333 }], { ...defaultContent, saleEnabled: true, salePercent: 90 });
  assert.equal(quote.subtotal, 21.98); assert.equal(quote.total, 16.66); assert.equal(quote.discount, 5.32);
});
test("quotes fail closed for missing products, invalid quantities, and unavailable personalization", () => {
  assert.throws(() => calculateCartQuote([{ id: "missing", quantity: 1 }], [product], defaultContent));
  assert.throws(() => calculateCartQuote([{ id: "p", quantity: 100 }], [product], defaultContent));
  assert.throws(() => calculateCartQuote([{ id: "p", quantity: 1, personalization: "Name" }], [{ ...product, personalizationMode: "none" }], defaultContent));
});
