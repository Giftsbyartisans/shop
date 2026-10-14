"use client";
import { useState, type FormEvent } from "react";
import { backendApiUrl } from "@/lib/backend-api";
import type { CustomerOrder } from "@/lib/customer-records";
import { checkoutEmail } from "@/lib/checkout-contact";
import OrderDetail from "./order-detail";
type Preview = Pick<CustomerOrder, "orderNumber" | "createdAt" | "status">;
export default function OrderFinder() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [selected, setSelected] = useState<CustomerOrder | null>(null);
  const [previews, setPreviews] = useState<Preview[] | null>(null);
  const [email, setEmail] = useState("");
  const [challenge, setChallenge] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function request(path: string, input: unknown) {
    const response = await fetch(backendApiUrl(path), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(25000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not track your order.");
    return result;
  }
  async function action(work: () => Promise<void>) {
    setBusy(true); setError("");
    try { await work(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not track your order."); }
    finally { setBusy(false); }
  }
  function reset() { setSelected(null); setOrders([]); setPreviews(null); setEmail(""); setChallenge(""); setError(""); }
  async function find(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await action(async () => {
      const value = String(data.get("lookup") || "").trim();
      const isTracking = /^GBA-/i.test(value);
      const normalized = isTracking ? "" : checkoutEmail(value);
      const result = await request("/order-finder", isTracking ? { trackingNumber: value } : { email: normalized });
      if (result.order) setSelected(result.order);
      else { setEmail(normalized); setPreviews(result.previews ?? []); }
    });
  }
  async function sendCode() { await action(async () => { const result = await request("/order-finder/code", { email }); setChallenge(result.challenge); }); }
  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    await action(async () => { const result = await request("/order-finder/verify", { email, challenge, code: data.get("code") }); setOrders(result.orders); setChallenge(""); if (result.orders.length === 1) setSelected(result.orders[0]); });
  }
  if (selected) return <><div className="shop order-finder-reset"><button type="button" onClick={reset}>Track another order</button></div><OrderDetail id={selected.id} initialOrder={selected} guest /></>;
  return <main className="shop order-finder-page"><h1>Track order</h1>{error && <p role="alert">{error}</p>}
    {orders.length > 0 ? <><p>Select an order to see its full details.</p>{orders.map(order => <p key={order.id}><button onClick={() => setSelected(order)}>{order.orderNumber}</button></p>)}<button onClick={reset}>Track another order</button></>
    : previews === null ? <><p>Enter your checkout email address or tracking number.</p><form className="order-finder-form" onSubmit={find}><fieldset disabled={busy}><label>Email address or tracking number<input name="lookup" required maxLength={254} autoComplete="off" /></label><button className="primary" type="submit">{busy ? "Tracking order…" : "Track order"}</button></fieldset></form></>
    : <><p>Orders for {email}</p>{previews.length ? previews.map((order, index) => <div className="order-finder-form" key={index}><p>{order.orderNumber}</p><p>{order.createdAt?.slice(0, 10)} · {order.status}</p></div>) : <p>No orders found.</p>}
      {previews.length > 0 && <><p>Verify your email to view items, prices, and delivery details.</p>{challenge ? <form className="order-finder-form" onSubmit={verify}><fieldset disabled={busy}><p>A verification code was sent to your email. It expires in 10 minutes.</p><label>Verification code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required /></label><button className="primary" type="submit">{busy ? "Verifying…" : "Verify and view orders"}</button><button type="button" onClick={sendCode}>Resend code</button></fieldset></form> : <button className="primary" disabled={busy} onClick={sendCode}>{busy ? "Sending code…" : "View full order details"}</button>}</>}
      <p><button disabled={busy} onClick={reset}>Track another order</button></p></>}
  </main>;
}
