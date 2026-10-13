import test from "node:test";
import assert from "node:assert/strict";
import { addCartItem, cartLineKey, changeQuantity, mergeCarts, parseShopping } from "../src/lib/shopping";
test("personalized cart lines retain their text and remain separate from other messages", () => {
  let state = addCartItem({ cart: [], favorites: [] }, "a", "  Alice  ");
  state = addCartItem(state, "a", "Bob");
  state = addCartItem(state, "a", "Alice");
  assert.equal(state.cart.length, 2);
  const alice = state.cart.find(item => item.personalization === "Alice")!;
  assert.equal(alice.quantity, 2);
  const restored = parseShopping(JSON.stringify(state));
  assert.deepEqual(restored, state);
  const updated = changeQuantity(restored, cartLineKey(alice), 3);
  assert.equal(updated.cart.find(item => item.personalization === "Alice")?.quantity, 3);
  assert.equal(updated.cart.find(item => item.personalization === "Bob")?.quantity, 1);
  assert.throws(() => addCartItem(state, "a", "a".repeat(1025)));
});
test("guest cart merges preserve products and can be retried without multiplying quantities", () => {
  const guest = [{ id: "a", quantity: 3 }, { id: "b", quantity: 1 }];
  const merged = mergeCarts([{ id: "a", quantity: 2 }, { id: "c", quantity: 4 }], guest);
  assert.deepEqual(merged, [{ id: "a", quantity: 3 }, { id: "c", quantity: 4 }, { id: "b", quantity: 1 }]);
  assert.deepEqual(mergeCarts(merged, guest), merged);
});
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
