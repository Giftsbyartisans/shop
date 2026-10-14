"use client";
import { useRef, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { backendApiUrl } from "@/lib/backend-api";
import { cartLineKey, type CartItem } from "@/lib/shopping";
import { updateShopping } from "./shopping-controls";
export default function PlaceOrder({ items, total, addressId, enabled, email, guestAddress, onPlaced }: { items: CartItem[]; total: number; addressId: string; enabled: boolean; email: string; guestAddress?: Record<string, string>; onPlaced: (orderNumber: string, trackingNumber: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState(false);
  const lock = useRef(false);
  const request = useRef<{ signature: string; id: string } | null>(null);
  async function place() {
    if (!enabled || lock.current || placed) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken.toString();
      const signature = JSON.stringify({ customer: session.tokens?.accessToken.payload.sub, items, addressId, total, email, guestAddress });
      const intentKey = "shop-pending-order";
      try {
        const saved = JSON.parse(sessionStorage.getItem(intentKey) || "null");
        if (saved?.signature === signature && typeof saved.id === "string") request.current = saved;
      } catch { /* In-memory retry protection still works without browser storage. */ }
      if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
      try { sessionStorage.setItem(intentKey, JSON.stringify(request.current)); } catch { /* Browser storage is optional. */ }
      const response = await fetch(backendApiUrl("/orders"), { method: "POST", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
        body: JSON.stringify({ items, addressId, email, guestAddress, expectedTotal: total, requestId: request.current.id }), signal: AbortSignal.timeout(30000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not place your order.");
      setPlaced(true); onPlaced(result.orderNumber, result.trackingNumber);
      try {
        const ordered = new Map(items.map(item => [cartLineKey(item), item.quantity]));
        await updateShopping(current => ({ ...current, cart: current.cart.flatMap(item => {
          const count = item.quantity - (ordered.get(cartLineKey(item)) ?? 0);
          return count > 0 ? [{ ...item, quantity: count }] : [];
        }) }));
        try { sessionStorage.removeItem(intentKey); } catch { /* Cart was cleared successfully. */ }
      } catch { setError("Your order was placed, but the cart could not be cleared. Refresh your account to view the order."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not place your order. Please retry."); }
    finally { lock.current = false; setBusy(false); }
  }
  if (!enabled) return <div className="order-now"><button className="primary" type="button" disabled>Place order</button><p className="muted">Online ordering is currently unavailable.</p></div>;
  return <div className="order-now">
    {error && <p role="alert">{error}</p>}
    <button className="primary" type="button" disabled={busy || placed || !addressId} onClick={place}>{placed ? "Order placed" : busy ? "Placing order…" : "Place order"}</button>
    <p className="muted">This creates a sample order. No payment will be collected.</p>
  </div>;
}
