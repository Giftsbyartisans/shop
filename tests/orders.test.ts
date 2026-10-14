import { test } from "node:test";
import assert from "node:assert/strict";
import { placeOrder, type OrderRecord, type OrderStore } from "../amplify/functions/shop-api/orders";
import { defaultContent } from "../src/lib/content";
import type { Listing } from "../src/lib/catalog";
const user = { sub: "customer-sub", username: "customer" };
const input = { requestId: "a7420300-90a4-4eea-a443-fbc8b20b11dd", addressId: "address", expectedTotal: 16, items: [{ id: "p", quantity: 2 }] };
function setup() {
  const records = new Map<string, OrderRecord>();
  const address = { owner: "customer-sub::customer", recipient: "Customer", line1: "Street", city: "City", postalCode: "123", country: "US", phone: "1234567890" };
  const store: OrderStore = { getOrder: async id => records.get(id) ?? null, address: async () => address,
    catalog: async () => ({ content: { ...defaultContent, saleEnabled: true, salePercent: 20 }, listings: [{ id: "p", price: 10, title: "Handicraft", image: "/image", published: true, personalizationMode: "none" } as Listing] }),
    create: async order => { if (records.has(order.id)) return false; records.set(order.id, order); return true; } };
  return { store, records, address };
}
test("places an unpaid owned order with server prices and an address snapshot", async () => {
  const { store, records, address } = setup();
  const receipt = await placeOrder(input, user, store);
  assert.equal(receipt.status, "pending"); assert.equal(receipt.total, 16);
  const order = records.get(receipt.id)!;
  assert.equal(order.owner, "customer-sub::customer");
  assert.equal(JSON.parse(order.items)[0].title, "Handicraft");
  address.line1 = "Changed";
  assert.equal(JSON.parse(order.shippingAddress).line1, "Street");
});
test("retries and concurrent submissions create only one order", async () => {
  const { store, records } = setup();
  const [first, second] = await Promise.all([placeOrder(input, user, store), placeOrder(input, user, store)]);
  assert.equal(first.id, second.id); assert.equal(records.size, 1);
  assert.deepEqual(await placeOrder(input, user, store), first);
  await assert.rejects(placeOrder({ ...input, expectedTotal: 17 }, user, store), /request has changed/);
});
test("rejects foreign addresses and changed prices before writing", async () => {
  const { store, records, address } = setup();
  address.owner = "different-customer";
  await assert.rejects(placeOrder(input, user, store), /saved to your account/);
  address.owner = "customer-sub::customer";
  await assert.rejects(placeOrder({ ...input, expectedTotal: 1 }, user, store), /Prices changed/);
  assert.equal(records.size, 0);
});
test("rejects empty carts and duplicate cart lines", async () => {
  const { store } = setup();
  await assert.rejects(placeOrder({ ...input, items: [] }, user, store));
  await assert.rejects(placeOrder({ ...input, items: [input.items[0], input.items[0]] }, user, store), /Duplicate/);
});

test("disabled ordering blocks new orders but allows a confirmed order retry", async () => {
  const { store, records } = setup();
  const receipt = await placeOrder(input, user, store);
  const catalog = store.catalog;
  store.catalog = async ids => {
    const result = await catalog(ids);
    return { ...result, content: { ...result.content, buyNowEnabled: false } };
  };
  await assert.rejects(placeOrder({ ...input, requestId: "b7420300-90a4-4eea-a443-fbc8b20b11dd" }, user, store), /ordering is currently unavailable/);
  assert.deepEqual(await placeOrder(input, user, store), receipt);
  assert.equal(records.size, 1);
});
