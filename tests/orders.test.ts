import { test } from "node:test";
import assert from "node:assert/strict";
import { foundOrderDetails, ownedOrderDetails, orderOwners, placeOrder, type OrderRecord, type OrderStore } from "../amplify/functions/shop-api/orders";
import { defaultContent } from "../src/lib/content";
import type { Listing } from "../src/lib/catalog";
const user = { sub: "customer-sub", username: "customer" };
const input = { email: "Customer@example.com", requestId: "a7420300-90a4-4eea-a443-fbc8b20b11dd", addressId: "address", expectedTotal: 16, items: [{ id: "p", quantity: 2 }] };
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
  assert.equal(receipt.isSample, true); assert.equal(receipt.status, "pending"); assert.equal(receipt.total, 16);
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

test("sample checkout cannot mark an order paid or remove its sample marker", async () => {
  const { store, records } = setup();
  const receipt = await placeOrder({ ...input, isSample: false, status: "paid" }, user, store);
  assert.equal(receipt.isSample, true);
  assert.equal(receipt.status, "pending");
  assert.equal(records.get(receipt.id)?.isSample, true);
});

test("order history ownership covers supported legacy formats without matching other customers", () => {
  const owners = orderOwners(user);
  assert.deepEqual(owners, ["customer-sub::customer", "customer-sub", "customer"]);
  assert.equal(owners.includes("another-sub::customer"), false);
  assert.equal(owners.includes("customer-sub::different"), false);
});

test("order detail rejects foreign or missing orders and excludes retry metadata", () => {
  const details = ownedOrderDetails({ id: "order", owner: "customer-sub::customer", total: 16, requestFingerprint: "private", __typename: "CustomerOrder" }, user);
  assert.equal(details.total, 16); assert.equal("requestFingerprint" in details, false);
  assert.throws(() => ownedOrderDetails({ owner: "someone-else" }, user), /Order not found/);
  assert.throws(() => ownedOrderDetails(null, user), /Order not found/);
});

test("guest orders are associated with normalized email and preserve delivery details", async () => {
  const { store, records, address } = setup();
  store.address = async () => { throw new Error("Guest must not read account addresses"); };
  const receipt = await placeOrder({ ...input, addressId: undefined, guestAddress: address }, null, store);
  const order = records.get(receipt.id)!;
  assert.equal(order.email, "customer@example.com");
  assert.match(order.owner, /^guest:/);
  assert.match(receipt.trackingNumber, /^GBA-[A-F0-9]{32}$/);
  assert.equal(JSON.parse(order.shippingAddress).phone, "1234567890");
  assert.equal((await placeOrder({ ...input, addressId: undefined, guestAddress: address }, null, store)).id, receipt.id);
});
test("guest checkout requires email and mobile and refuses prices supplied by the browser", async () => {
  const { store, address, records } = setup();
  await assert.rejects(placeOrder({ ...input, email: "", guestAddress: address }, null, store), /email/);
  await assert.rejects(placeOrder({ ...input, guestAddress: { ...address, phone: "" } }, null, store), /required shipping/);
  await assert.rejects(placeOrder({ ...input, guestAddress: { ...address, phone: "invalid" } }, null, store), /mobile/);
  await assert.rejects(placeOrder({ ...input, expectedTotal: 1, guestAddress: address }, null, store), /Prices changed/);
  assert.equal(records.size, 0);
});
test("finder requires both matching email and the private tracking number", async () => {
  const { store, address, records } = setup();
  const receipt = await placeOrder({ ...input, guestAddress: address }, null, store);
  const order = records.get(receipt.id)!;
  const details = foundOrderDetails(order, " CUSTOMER@EXAMPLE.COM ", receipt.trackingNumber.toLowerCase());
  assert.equal(details.id, order.id); assert.equal("owner" in details, false); assert.equal("requestFingerprint" in details, false);
  assert.throws(() => foundOrderDetails(order, "other@example.com", receipt.trackingNumber), /No order matches/);
  assert.throws(() => foundOrderDetails(order, order.email, "GBA-" + "0".repeat(32)), /No order matches/);
  assert.throws(() => foundOrderDetails(order, order.email, order.orderNumber), /No order matches/);
});

test("account usernames cannot claim email-based guest identities", () => {
  const guestOwner = "guest:" + "a".repeat(64);
  const user = { sub: "attacker-sub", username: guestOwner };
  assert.equal(orderOwners(user).includes(guestOwner), false);
  assert.throws(() => ownedOrderDetails({ owner: guestOwner }, user), /Order not found/);
});
