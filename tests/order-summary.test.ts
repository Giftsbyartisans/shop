import { test } from "node:test";
import assert from "node:assert/strict";
import { orderSummaryItems, orderSummaryAddress } from "../src/lib/order-summary";
test("order summaries read archived item and address JSON without current catalog data", () => {
  const items = orderSummaryItems(JSON.stringify([{ id: "p", title: "Archived title", quantity: 2, unitPrice: 10, total: 20, personalization: "Name" }]));
  assert.equal(items[0].title, "Archived title"); assert.equal(items[0].total, 20);
  assert.equal(orderSummaryAddress('{"recipient":"Customer","line1":"Saved street"}')?.line1, "Saved street");
});
test("legacy and malformed order snapshots have safe display fallbacks", () => {
  assert.deepEqual(orderSummaryItems("broken"), []);
  assert.equal(orderSummaryItems([{ id: "p", quantity: 1 }])[0].title, "Product p");
  assert.deepEqual(orderSummaryItems([{ id: "p", quantity: -1 }]), []);
  assert.equal(orderSummaryAddress("broken"), null);
});
