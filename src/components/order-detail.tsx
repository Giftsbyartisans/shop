"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { loadOrder, type CustomerOrder } from "@/lib/customer-records";
import { orderSummaryItems, orderSummaryAddress } from "@/lib/order-summary";
import { deliveryEstimate } from "@/lib/delivery-estimate";
import ShopImage from "./shop-image";
export default function OrderDetail({ id, initialOrder, guest = false }: { id: string; initialOrder?: CustomerOrder; guest?: boolean }) {
  const [order, setOrder] = useState<CustomerOrder | null>(initialOrder ?? null);
  const [loading, setLoading] = useState(!initialOrder);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (initialOrder) return;
    let active = true; setLoading(true); setError("");
    void (async () => {
      try {
        const session = await fetchAuthSession();
        if (!session.tokens) { if (active) setSignedIn(false); return; }
        const result = await loadOrder(id);
        if (active) { setOrder(result); setSignedIn(true); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Could not load your order."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [id, revision, initialOrder]);
  const back = <div className="order-detail-topbar">{guest ? <a href="/order-finder">← Track order</a> : <Link href="/account?section=orders">← Your orders</Link>}<Link href="/" className="brand">GiftsByArtisans</Link></div>;
  if (loading) return <main className="shop order-detail-page">{back}<p role="status">Loading order summary…</p></main>;
  if (!signedIn) return <main className="shop order-detail-page">{back}<h1>Your order</h1><p>Sign in to view your order summary.</p><Link href={`/login?next=${encodeURIComponent(`/account/orders/${id}`)}`}>Sign in →</Link></main>;
  if (error || !order) return <main className="shop order-detail-page">{back}<p role="alert">{error || "Order not found."}</p><button onClick={() => setRevision(value => value + 1)}>Try again</button></main>;
  const items = orderSummaryItems(order.items), address = orderSummaryAddress(order.shippingAddress);
  const currency = /^[A-Z]{3}$/.test(order.currency) ? order.currency : "USD";
  const money = (value: number | null | undefined) => typeof value === "number" ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value) : "—";
  const date = new Date(order.createdAt);
  const validDate = Number.isFinite(date.getTime());
  return <main className="shop order-detail-page">{back}
    <header className="order-detail-heading"><div><p className="eyebrow">{order.isSample ? "SAMPLE ORDER" : "ORDER SUMMARY"}</p><h1>{order.orderNumber}</h1><p>{validDate ? date.toLocaleDateString("en-US", { dateStyle: "long" }) : ""}</p></div><span className="order-detail-status">{order.status === "pending" ? "Pending · unpaid" : order.status || "Pending"}</span></header>
    {order.isSample && <p className="order-detail-sample">This is a sample order. No payment was collected.</p>}
    <div className="checkout-layout"><section>
      <section className="order-detail-panel"><h2>Items</h2>{items.length ? items.map((item, index) => <article className="order-detail-item" key={`${item.id}-${index}`}>
        {item.image && <ShopImage src={item.image} alt={item.title} sizes="96px" />}<div><h3>{item.title}</h3><p>Quantity: {item.quantity}</p>{item.unitPrice !== undefined && <p>Price per item: {money(item.unitPrice)}</p>}{item.personalization && <p className="checkout-personalization">Personalization: {item.personalization}{item.personalizationPrice !== undefined && <><br />Personalization per item: {money(item.personalizationPrice)}</>}</p>}</div><span>{money(item.total)}</span>
      </article>) : <p>Item details were not recorded for this order.</p>}</section>
      <section className="order-detail-panel"><h2>Shipping address</h2>{order.email && <p>Email: {order.email}</p>}{address ? <address>{address.recipient}<br />{address.line1}{address.line2 && <><br />{address.line2}</>}<br />{address.city}{address.region ? `, ${address.region}` : ""} {address.postalCode}<br />{address.country}{address.phone && <><br />{address.phone}</>}</address> : <p>Shipping details were not recorded for this order.</p>}{validDate && <p className="shopping-delivery-estimate">Estimated delivery: {deliveryEstimate(date)}</p>}{order.trackingUrl?.startsWith("https://") && <Link href={order.trackingUrl} target="_blank" rel="noopener noreferrer">Track shipment ↗</Link>}</section>
    </section><aside className="shopping-summary order-detail-summary"><h2>Order summary</h2><p className="shopping-summary-row"><span>MSRP</span><span>{money(order.subtotal)}</span></p><p className="shopping-summary-row"><span>Discount</span><span>{order.discount ? "−" : ""}{money(order.discount)}</span></p><p className="shopping-summary-row"><span>Shipping charges</span><span>{order.shipping === 0 ? "Free" : money(order.shipping)}</span></p><p className="shopping-summary-row shopping-summary-total"><span>Total</span><span>{money(order.total)}</span></p><p className="muted">Currency: {currency}</p>{order.trackingNumber && <p className="order-tracking-number">Tracking number<br /><code>{order.trackingNumber}</code></p>}{guest && <a href="/order-finder">Track another order</a>}</aside></div>
  </main>;
}
