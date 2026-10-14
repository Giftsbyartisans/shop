"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { loadAddresses, type Address } from "@/lib/customer-records";
import { backendApiUrl } from "@/lib/backend-api";
import { cartLineKey, type CartItem } from "@/lib/shopping";
import { updateShopping } from "./shopping-controls";
export default function OrderNow({ items, total, signedIn, enabled, onPlaced }: { items: CartItem[]; total: number; signedIn: boolean; enabled: boolean; onPlaced: (orderNumber: string) => void }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState(false);
  const lock = useRef(false);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!signedIn || !enabled) return;
    let active = true;
    setLoading(true); setError("");
    loadAddresses().then(result => { if (active) { setAddresses(result); setAddressId(result.find(address => address.isDefault)?.id ?? result[0]?.id ?? ""); } })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Could not load shipping addresses."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [signedIn, enabled, revision]);
  async function place() {
    if (!enabled || lock.current || placed) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken.toString();
      if (!token) throw new Error("Sign in to place your order.");
      const signature = JSON.stringify({ customer: session.tokens?.accessToken.payload.sub, items, addressId, total });
      const intentKey = "shop-pending-order";
      try {
        const saved = JSON.parse(sessionStorage.getItem(intentKey) || "null");
        if (saved?.signature === signature && typeof saved.id === "string") request.current = saved;
      } catch { /* In-memory retry protection still works without browser storage. */ }
      if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
      try { sessionStorage.setItem(intentKey, JSON.stringify(request.current)); } catch { /* Browser storage is optional. */ }
      const response = await fetch(backendApiUrl("/orders"), { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ items, addressId, expectedTotal: total, requestId: request.current.id }), signal: AbortSignal.timeout(30000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not place your order.");
      setPlaced(true); onPlaced(result.orderNumber);
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
  if (!enabled) return <div className="order-now"><button className="primary" type="button" disabled>Order now</button><p className="muted">Online ordering is currently unavailable.</p></div>;
  if (!signedIn) return <div className="order-now"><Link href="/login?next=%2Fcart">Sign in to order</Link><p className="muted">Sign in and save a shipping address to place an order.</p></div>;
  return <div className="order-now">
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Loading shipping addresses…</p> : !addresses.length ? <><Link href="/account?section=addresses">Add a shipping address</Link><button type="button" onClick={() => setRevision(value => value + 1)}>Reload addresses</button></> : <>
      <label>Ship to<select value={addressId} disabled={busy || placed} onChange={event => setAddressId(event.target.value)}>{addresses.map(address => <option key={address.id} value={address.id}>{address.label || address.recipient} — {address.city}, {address.country}</option>)}</select></label>
      {addresses.find(address => address.id === addressId) && <p className="muted">{addresses.find(address => address.id === addressId)?.recipient}, {addresses.find(address => address.id === addressId)?.line1}</p>}
      <button className="primary" type="button" disabled={busy || placed || !addressId} onClick={place}>{placed ? "Order placed" : busy ? "Placing order…" : "Order now"}</button>
      <p className="muted">Your order will be placed with payment pending. No payment is collected now.</p>
    </>}
  </div>;
}
