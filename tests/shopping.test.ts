import test from "node:test";
import assert from "node:assert/strict";
import { changeQuantity, parseShopping } from "../src/lib/shopping";
test("stored shopping data rejects malformed entries and duplicates", () => {
  assert.deepEqual(parseShopping("invalid"), { cart: [], favorites: [] });
  assert.deepEqual(parseShopping(JSON.stringify({ cart: [{ id: "a", quantity: 2 }, { id: "a", quantity: 3 }, { id: "bad", quantity: -1 }, { id: "b", quantity: 1000 }], favorites: ["a", "a", null, 1] })), { cart: [{ id: "a", quantity: 3 }, { id: "b", quantity: 99 }], favorites: ["a"] });
});
test("quantity updates replace one line, remove at zero, and reject invalid quantities", () => {
  const state = { cart: [{ id: "a", quantity: 2 }], favorites: ["a"] };
  assert.deepEqual(changeQuantity(state, "a", 3), { cart: [{ id: "a", quantity: 3 }], favorites: ["a"] });
  assert.deepEqual(changeQuantity(state, "a", 0), { cart: [], favorites: ["a"] });
  for (const quantity of [-1, 1.5, 100, NaN]) assert.throws(() => changeQuantity(state, "a", quantity));
  assert.equal(state.cart[0].quantity, 2);
});
