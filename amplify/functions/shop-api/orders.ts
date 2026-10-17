import { validCartId } from "../../../src/lib/cart-identity";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { checkoutEmail, checkoutAddress } from "../../../src/lib/checkout-contact";
import { calculateCartTotals } from "../../../src/lib/cart-totals";
import { cartLineKey, type CartItem } from "../../../src/lib/shopping";
import { listingPrice, type Listing } from "../../../src/lib/catalog";
import { resolvePersonalization } from "../../../src/lib/personalization";
import type { ShopContent } from "../../../src/lib/content";
export class OrderError extends Error { constructor(message: string, public status = 400) { super(message); } }
export type OrderRecord = { cartId?: string; email: string; trackingNumber: string; isSample: boolean; id: string; owner: string; orderNumber: string; status: "pending" | "paid"; paymentMethod?: string; paypalMode?: "sandbox" | "live"; paypalOrderId?: string; paypalCaptureId?: string; total: number; currency: string; items: string; shippingAddress: string; subtotal: number; discount: number; shipping: number; requestFingerprint: string; createdAt: string; updatedAt: string; __typename: string };
export function cartOrderId(cartId: string, mode: "sandbox" | "live") {
  if (!validCartId(cartId)) throw new OrderError("Invalid cart ID.");
  return createHash("sha256").update(`cart:${cartId}:${mode}`).digest("hex");
}
export function orderOwners(user: { sub: string; username: string }) {
  return [`${user.sub}::${user.username}`, user.sub, user.username].filter(owner => !owner.startsWith("guest:"));
}
export function ownedOrderDetails(order: Record<string, unknown> | null, user: { sub: string; username: string }) {
  if (!order || typeof order.owner !== "string" || !orderOwners(user).includes(order.owner)) throw new OrderError("Order not found.", 404);
  const { requestFingerprint: _fingerprint, __typename: _typename, ...details } = order;
  return details;
}
export type OrderStore = {
  getOrder(id: string): Promise<OrderRecord | null>;
  address(id: string): Promise<Record<string, unknown> | null>;
  catalog(ids: string[]): Promise<{ listings: Listing[]; content: ShopContent }>;
  create(order: OrderRecord): Promise<boolean>;
};
export async function preparePaymentAttempt(input: unknown, user: { sub: string; username: string } | null, store: OrderStore, paymentMode: "sandbox" | "live" = "sandbox") {
  const body = input as { cartId?: string; requestId?: string; addressId?: string; items?: CartItem[]; expectedTotal?: number; email?: string; guestAddress?: unknown };
  if (!body || typeof body.requestId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.requestId) || (user !== null && (typeof body.addressId !== "string" || !body.addressId || body.addressId.length > 200)) || !Array.isArray(body.items) || !body.items.length || body.items.length > 100 || !Number.isFinite(body.expectedTotal)) throw new OrderError("Choose a shipping address and add products before ordering.");
  if (body.cartId !== undefined && !validCartId(body.cartId)) throw new OrderError("Invalid cart ID. Refresh your cart.");
  let email: string;
  try { email = checkoutEmail(body.email); } catch (error) { throw new OrderError((error as Error).message); }
  const items = body.items.map(entry => {
    if (!entry || typeof entry.id !== "string" || !entry.id || entry.id.length > 200 || !Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > 99 || (entry.personalization !== undefined && (typeof entry.personalization !== "string" || entry.personalization.length > 1024))) throw new OrderError("Invalid cart items.");
    return { id: entry.id, quantity: entry.quantity, ...(entry.personalization ? { personalization: entry.personalization } : {}) };
  });
  if (new Set(items.map(cartLineKey)).size !== items.length) throw new OrderError("Duplicate cart lines are not allowed.");
  const guestIdentity = createHash("sha256").update(email).digest("hex");
  const owner = user ? `${user.sub}::${user.username}` : `guest:${guestIdentity}`;
  const id = body.cartId ? cartOrderId(body.cartId,paymentMode) : createHash("sha256").update(`${user?.sub ?? owner}:${body.requestId}:paypal:${paymentMode}`).digest("hex");
  const fingerprint = createHash("sha256").update(JSON.stringify({ items, addressId: user ? body.addressId : undefined, guestAddress: user ? undefined : body.guestAddress, email, expectedTotal: body.expectedTotal })).digest("hex");
  const receipt = (order: OrderRecord) => {
    if (order.owner !== owner || order.requestFingerprint !== fingerprint) throw new OrderError("This order request has changed. Refresh your cart before ordering.", 409);
    return { id: order.id, orderNumber: order.orderNumber, status: order.status, total: order.total, currency: order.currency, isSample: order.isSample, trackingNumber: order.trackingNumber, email: order.email };
  };
  const existing = await store.getOrder(id);
  if (existing) return receipt(existing);
  const address = user ? await store.address(body.addressId!) : body.guestAddress;
  if (user && (!address || ((address as Record<string, unknown>).owner !== owner && (address as Record<string, unknown>).owner !== user.sub))) throw new OrderError("Choose a shipping address saved to your account.");
  let shippingAddress: Record<string, string>;
  try { shippingAddress = checkoutAddress(address); } catch (error) { throw new OrderError((error as Error).message); }
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
  const order: OrderRecord = { ...(body.cartId ? { cartId:body.cartId } : {}), email, trackingNumber: `GBA-${randomBytes(16).toString("hex").toUpperCase()}`, isSample: paymentMode !== "live", paymentMethod: "paypal", paypalMode: paymentMode, id, owner, orderNumber: `GBA-${id.slice(0, 12).toUpperCase()}`, status: "pending", total: totals.total, currency: "USD", items: JSON.stringify(snapshots), shippingAddress: JSON.stringify(shippingAddress), subtotal: totals.subtotal, discount: totals.discount, shipping: totals.shipping, requestFingerprint: fingerprint, createdAt: now, updatedAt: now, __typename: "CustomerOrder" };
  if (!await store.create(order)) {
    const winner = await store.getOrder(id);
    if (!winner) throw new Error("Order could not be confirmed. Retry using the same request.");
    return receipt(winner);
  }
  return receipt(order);
}

export function foundOrderDetails(order: Record<string, unknown> | null, emailValue: unknown, trackingValue: unknown) {
  let email: string;
  try { email = checkoutEmail(emailValue); } catch { throw new OrderError("No order matches those details.", 404); }
  if (typeof trackingValue !== "string" || !/^GBA-[A-F0-9]{32}$/.test(trackingValue.trim().toUpperCase())) throw new OrderError("No order matches those details.", 404);
  const tracking = trackingValue.trim().toUpperCase();
  if (!order || typeof order.email !== "string" || typeof order.trackingNumber !== "string" || order.email !== email) throw new OrderError("No order matches those details.", 404);
  const saved = Buffer.from(order.trackingNumber), supplied = Buffer.from(tracking);
  if (saved.length !== supplied.length || !timingSafeEqual(saved, supplied)) throw new OrderError("No order matches those details.", 404);
  const { owner: _owner, requestFingerprint: _fingerprint, __typename: _typename, ...details } = order;
  return details;
}

export function hasConfirmedPayment(order: { paypalCaptureId?: unknown } | null | undefined): boolean {
  return typeof order?.paypalCaptureId === 'string' && order.paypalCaptureId.length > 0;
}
