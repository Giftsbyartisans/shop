"use client";
import { listingPath } from "@/lib/listing-url";
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { fetchTokenSession } from "@/lib/auth-session";
import { backendApiUrl } from '@/lib/backend-api';
import type { CustomerOrder } from '@/lib/customer-records';
import { orderSummaryAddress, orderSummaryItems } from '@/lib/order-summary';
import { type OrderProgress } from '@/lib/admin-orders';
import ShopImage from './shop-image';
import styles from './admin-orders.module.css';
type Order = CustomerOrder & { shipmentTrackingNumber?: string | null; isGuest?: boolean; fulfillmentProgress?: OrderProgress | null; completedAt?: string | null };
async function api(path: string, update?: unknown) {
  const session = await fetchTokenSession(); const token = session.tokens?.accessToken.toString();
  if (!token) throw new Error('Admin sign-in required.');
  const response = await fetch(backendApiUrl(path), { method: update ? 'PUT' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(update ? { body: JSON.stringify(update) } : {}) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Orders could not be loaded.'); return result;
}
const dateLabel = (value: string) => new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export default function AdminOrders() {
  const [completing, setCompleting] = useState<Order | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (completing) dialog.current?.showModal(); }, [completing]);
  const [orders, setOrders] = useState<Order[]>([]), [tab, setTab] = useState('new');
  const [selected, setSelected] = useState<string[]>([]), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => { let active = true; setLoading(true); setError('');
    (async () => { const all: Order[] = []; let nextToken: string | null = null;
      do { const result = await api(`/admin/orders${nextToken ? `?nextToken=${encodeURIComponent(nextToken)}` : ''}`); all.push(...result.orders); nextToken = result.nextToken; } while (nextToken);
      if (active) { setOrders(all.sort((a,b) => b.createdAt.localeCompare(a.createdAt))); setSelected([]); }
    })().catch(cause => { if (active) setError(cause.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; };
  }, []);
  async function update(ids: string[], progress: OrderProgress, shipmentTrackingNumber?: string, trackingUrl?: string) {
    setBusy(true); setError('');
    try { for (const id of ids) { const result = await api(`/admin/orders/${encodeURIComponent(id)}`, { progress, ...(trackingUrl !== undefined ? { trackingUrl } : {}), ...(shipmentTrackingNumber !== undefined ? { shipmentTrackingNumber } : {}) }); setOrders(previous => previous.map(order => order.id === id ? result.order : order)); setSelected(previous => previous.filter(value => value !== id)); } return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update orders.'); return false; } finally { setBusy(false); }
  }
  const visible = orders.filter(order => (tab === 'completed') === (order.fulfillmentProgress === 'completed'));
  const groups = new Map<string, Order[]>();
  for (const order of visible) { const day = order.createdAt.slice(0,10); groups.set(day, [...(groups.get(day) ?? []), order]); }
  function select(ids: string[]) { setSelected(previous => ids.every(id => previous.includes(id)) ? previous.filter(id => !ids.includes(id)) : [...new Set([...previous, ...ids])]); }
  return <div className={styles.root}>
    <div className={styles.tabs} role="tablist" aria-label="Orders">{['new','completed'].map(value => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setSelected([]); }}>{value === 'new' ? 'New' : 'Completed'} <span>{orders.filter(order => (value === 'completed') === (order.fulfillmentProgress === 'completed')).length}</span></button>)}</div>
    {error && <p role="alert">{error}</p>}
    <div className={styles.layout}>
    <div role="tabpanel" aria-label={tab === 'new' ? 'New orders' : 'Completed orders'}>
      {selected.length > 0 && <div className={styles.toolbar}><span>{selected.length} selected</span><button type="button" disabled={busy} onClick={() => update(selected, tab === 'new' ? 'completed' : 'new')}>{tab === 'new' ? 'Complete selected' : 'Move selected to New'}</button></div>}
      {loading ? <p role="status">Loading orders…</p> : !visible.length ? <p>{error ? 'Orders could not be loaded. Reopen the Orders section to try again.' : 'No orders match this view.'}</p> : Array.from(groups, ([day, daily]) => <section className={styles.group} key={day}>
        <div className={styles.groupHeading}><strong>Ordered {dateLabel(day)}</strong><span>{daily.length}</span><button type="button" disabled={busy} onClick={() => select(daily.map(order => order.id))}>{daily.every(order => selected.includes(order.id)) ? 'Deselect all' : 'Select all'}</button></div>
        {daily.map(order => { const address = orderSummaryAddress(order.shippingAddress); const items = orderSummaryItems(order.items); const currency = /^[A-Z]{3}$/.test(order.currency) ? order.currency : 'USD'; const money = (value: number | null | undefined) => typeof value !== 'number' || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('en-US',{style:'currency',currency}).format(value);
          return <article className={styles.order} key={order.id}>
            <input className={styles.checkbox} type="checkbox" aria-label={`Select order ${order.orderNumber}`} checked={selected.includes(order.id)} disabled={busy} onChange={() => select([order.id])} />
            <div><h3>{address?.recipient || 'Customer'} {order.isGuest && <small>(Guest)</small>}</h3><p className={styles.orderNumber}>{order.orderNumber} <span>{money(order.total)}</span></p><p>{order.isSample ? 'Test order · ' : ''}{order.status === 'pending' ? 'Pending · unpaid' : order.status}</p>
              {items.map((item,index) => <div className={styles.item} key={`${item.id}-${index}`}>{item.image && <Link className={styles.productImage} href={listingPath(item)} target="_blank" rel="noopener noreferrer"><ShopImage src={item.image} alt={item.title} sizes="100px" /></Link>}<div><p><Link className={styles.productTitle} href={listingPath(item)} target="_blank" rel="noopener noreferrer">{item.title}</Link></p><p>Quantity <strong>{item.quantity}</strong></p>{item.personalization && <p>Personalization: {item.personalization}</p>}</div></div>)}
              {!items.length && <p>Item details were not recorded.</p>}

            </div>
            <div className={styles.shipping}><p>Ordered {dateLabel(order.createdAt)}</p>
              <div className={styles.address}><strong>Ship to</strong>{address ? <address>{address.recipient}<br />{address.line1}{address.line2 && <><br />{address.line2}</>}<br />{address.city}, {address.region} {address.postalCode}<br />{address.country}<br />{address.phone}</address> : <p>No address recorded.</p>}{order.email && <p>{order.email}</p>}</div>
              {order.shipmentTrackingNumber && <p className={styles.trackingNumber}>Shipment tracking: {order.shipmentTrackingNumber}</p>}
              {order.trackingUrl?.startsWith('https://') && <p><a href={order.trackingUrl} target="_blank" rel="noopener noreferrer">Track shipment ↗</a></p>}
              <section className={styles.summary} aria-label={`Order summary for ${order.orderNumber}`}><h4>Order summary</h4><dl>
                <div><dt>MSRP</dt><dd>{money(order.subtotal)}</dd></div>
                <div><dt>Discount</dt><dd>{order.discount ? '−' : ''}{money(order.discount)}</dd></div>
                <div><dt>Shipping charges</dt><dd>{order.shipping === 0 ? 'Free' : money(order.shipping)}</dd></div>
                <div className={styles.summaryTotal}><dt>Total</dt><dd>{money(order.total)}</dd></div>
              </dl><p>Currency: {currency}</p></section>
            </div>
            <button type="button" className={styles.progressButton} title="Update progress" disabled={busy} aria-label={`Complete order ${order.orderNumber} or add tracking`} onClick={() => { setError(''); setCompleting(order); }}><svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.75C6.339 1.75 1.75 6.34 1.75 12S6.339 22.25 12 22.25C14.592 22.25 16.958 21.284 18.762 19.698L19.62 21.698A.5.5 0 0 0 20.079 22H20.249A.5.5 0 0 0 20.749 21.5V16.751A.75.75 0 0 0 19.999 16.001H15.249A.5.5 0 0 0 14.75 16.501V16.671C14.75 16.87 14.87 17.05 15.053 17.13L16.965 17.95A7.75 7.75 0 1 1 18.708 8.116C18.846 8.354 19.145 8.456 19.392 8.333L20.735 7.666A.48.48 0 0 0 20.95 7.001 10.25 10.25 0 0 0 12 1.75" /><path d="M15.924 8.396A.5.5 0 0 0 15.217 8.396L10.97 12.642 9.376 11.046A.5.5 0 0 0 8.669 11.046L8.146 11.569A.5.5 0 0 0 8.096 12.217L10.403 15.39A.75.75 0 0 0 11.587 15.43L16.457 9.572A.5.5 0 0 0 16.427 8.9z" /></svg></button>
          </article>;
        })}
      </section>)}
    </div></div>
    {completing && <dialog ref={dialog} className={styles.completionModal} aria-labelledby="complete-order-heading" onCancel={event => { if (busy) event.preventDefault(); else setCompleting(null); }}>
      <form onSubmit={async event => { event.preventDefault(); const data = new FormData(event.currentTarget); const tracking = String(data.get('shipmentTrackingNumber') || '').trim(); if (await update([completing.id], 'completed', tracking || undefined, String(data.get('trackingUrl') || '').trim() || undefined)) setCompleting(null); }}>
        <h2 id="complete-order-heading">{completing.fulfillmentProgress === 'completed' ? 'Update tracking' : 'Complete order'}</h2><p>{completing.orderNumber}</p>
        <label>Tracking number (optional)<input name="shipmentTrackingNumber" defaultValue={completing.shipmentTrackingNumber || ''} maxLength={100} disabled={busy} autoFocus /></label>
        <label>Tracking URL (optional)<input name="trackingUrl" type="url" pattern="https://.*" placeholder="https://…" defaultValue={completing.trackingUrl || ''} maxLength={2048} disabled={busy} /></label>
        <p>You can complete the order without tracking details.</p>{error && <p role="alert">{error}</p>}
        <div className={styles.modalActions}><button type="button" disabled={busy} onClick={() => setCompleting(null)}>Cancel</button><button type="submit" className="primary" disabled={busy}>{busy ? 'Saving…' : completing.fulfillmentProgress === 'completed' ? 'Save tracking' : 'Move to completed'}</button></div>
      </form>
    </dialog>}
  </div>;
}
