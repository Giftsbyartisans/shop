import { createHash } from "node:crypto";
import { calculateCartTotals } from "../../../src/lib/cart-totals";
import { cartLineKey, type CartItem } from "../../../src/lib/shopping";
import { listingPrice, type Listing } from "../../../src/lib/catalog";
import { resolvePersonalization } from "../../../src/lib/personalization";
import type { ShopContent } from "../../../src/lib/content";
export class OrderError extends Error { constructor(message: string, public status = 400) { super(message); } }
export type OrderRecord = { id: string; owner: string; orderNumber: string; status: "pending"; total: number; currency: string; items: string; shippingAddress: string; subtotal: number; discount: number; shipping: number; requestFingerprint: string; createdAt: string; updatedAt: string; __typename: string };
export type OrderStore = {
  getOrder(id: string): Promise<OrderRecord | null>;
  address(id: string): Promise<Record<string, unknown> | null>;
  catalog(ids: string[]): Promise<{ listings: Listing[]; content: ShopContent }>;
  create(order: OrderRecord): Promise<boolean>;
};
export async function placeOrder(input: unknown, user: { sub: string; username: string }, store: OrderStore) {
  const body = input as { requestId?: string; addressId?: string; items?: CartItem[]; expectedTotal?: number };
  if (!body || typeof body.requestId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.requestId) || typeof body.addressId !== "string" || !body.addressId || body.addressId.length > 200 || !Array.isArray(body.items) || !body.items.length || body.items.length > 100 || !Number.isFinite(body.expectedTotal)) throw new OrderError("Choose a shipping address and add products before ordering.");
  const items = body.items.map(entry => {
    if (!entry || typeof entry.id !== "string" || !entry.id || entry.id.length > 200 || !Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > 99 || (entry.personalization !== undefined && (typeof entry.personalization !== "string" || entry.personalization.length > 1024))) throw new OrderError("Invalid cart items.");
    return { id: entry.id, quantity: entry.quantity, ...(entry.personalization ? { personalization: entry.personalization } : {}) };
  });
  if (new Set(items.map(cartLineKey)).size !== items.length) throw new OrderError("Duplicate cart lines are not allowed.");
  const owner = `${user.sub}::${user.username}`;
  const id = createHash("sha256").update(`${user.sub}:${body.requestId}`).digest("hex");
  const fingerprint = createHash("sha256").update(JSON.stringify({ items, addressId: body.addressId, expectedTotal: body.expectedTotal })).digest("hex");
  const receipt = (order: OrderRecord) => {
    if (order.owner !== owner || order.requestFingerprint !== fingerprint) throw new OrderError("This order request has changed. Refresh your cart before ordering.", 409);
    return { id: order.id, orderNumber: order.orderNumber, status: order.status, total: order.total, currency: order.currency };
  };
  const existing = await store.getOrder(id);
  if (existing) return receipt(existing);
  const address = await store.address(body.addressId);
  if (!address || (address.owner !== owner && address.owner !== user.sub)) throw new OrderError("Choose a shipping address saved to your account.");
  const shippingAddress: Record<string, string> = {};
  for (const key of ["recipient", "line1", "line2", "city", "region", "postalCode", "country", "phone"]) {
    const value = address[key];
    if (!["line2", "region"].includes(key) && (typeof value !== "string" || !value.trim())) throw new OrderError("Complete your shipping address before ordering.");
    shippingAddress[key] = typeof value === "string" ? value : "";
  }
  const { listings, content } = await store.catalog([...new Set(items.map(item => item.id))]);
  if (content.buyNowEnabled !== true) throw new OrderError("Online ordering is currently unavailable.", 403);
  let totals;
  try { totals = calculateCartTotals(items, listings, content); }
  catch (error) { throw new OrderError(error instanceof Error ? error.message : "Could not calculate order prices."); }
  if (Math.round(totals.total * 100) !== Math.round(body.expectedTotal! * 100)) throw new OrderError("Prices changed. Refresh the cart totals and review them before ordering.", 409);
  const catalog = new Map(listings.map(item => [item.id, resolvePersonalization(item, content)]));
  const snapshots = items.map((entry, index) => {
    const item = catalog.get(entry.id)!;
    return { ...entry, title: item.title, image: item.image, unitPrice: Math.round(listingPrice(item, content.saleEnabled, content.salePercent) * 100) / 100, personalizationPrice: entry.personalization ? item.personalizationPrice ?? 0 : 0, total: totals.lines[index].total };
  });
  const now = new Date().toISOString();
  const order: OrderRecord = { id, owner, orderNumber: `GBA-${id.slice(0, 12).toUpperCase()}`, status: "pending", total: totals.total, currency: "USD", items: JSON.stringify(snapshots), shippingAddress: JSON.stringify(shippingAddress), subtotal: totals.subtotal, discount: totals.discount, shipping: totals.shipping, requestFingerprint: fingerprint, createdAt: now, updatedAt: now, __typename: "CustomerOrder" };
  if (!await store.create(order)) {
    const winner = await store.getOrder(id);
    if (!winner) throw new Error("Order could not be confirmed. Retry using the same request.");
    return receipt(winner);
  }
  return receipt(order);
}
