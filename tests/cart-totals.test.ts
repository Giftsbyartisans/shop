import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateCartTotals } from "../src/lib/cart-totals";
import { defaultContent } from "../src/lib/content";
import type { Listing } from "../src/lib/catalog";
const product = { id: "p", price: 10, published: true, personalizationMode: "custom", personalizationPrice: 2 } as Listing;
test("server cart calculation applies quantities and discount without discounting personalization", () => {
  const totals = calculateCartTotals([{ id: "p", quantity: 3, personalization: "Name" }], [product], { ...defaultContent, saleEnabled: true, salePercent: 20 });
  assert.equal(totals.subtotal, 36); assert.equal(totals.discount, 6); assert.equal(totals.total, 30); assert.equal(totals.shipping, 0);
});
test("explicit sale prices override shop sales and cents round before quantity", () => {
  const totals = calculateCartTotals([{ id: "p", quantity: 2 }], [{ ...product, price: 10.99, salePrice: 8.333 }], { ...defaultContent, saleEnabled: true, salePercent: 90 });
  assert.equal(totals.subtotal, 21.98); assert.equal(totals.total, 16.66); assert.equal(totals.discount, 5.32);
});
test("cart totals fail closed for missing products, invalid quantities, and unavailable personalization", () => {
  assert.throws(() => calculateCartTotals([{ id: "missing", quantity: 1 }], [product], defaultContent));
  assert.throws(() => calculateCartTotals([{ id: "p", quantity: 100 }], [product], defaultContent));
  assert.throws(() => calculateCartTotals([{ id: "p", quantity: 1, personalization: "Name" }], [{ ...product, personalizationMode: "none" }], defaultContent));
});
