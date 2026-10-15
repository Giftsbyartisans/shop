"use client";
import { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { backendApiUrl } from '@/lib/backend-api';
import type { CustomerOrder } from '@/lib/customer-records';
import { orderSummaryAddress, orderSummaryItems } from '@/lib/order-summary';
import { matchesShipDate, orderProgress, progressLabel, type OrderProgress } from '@/lib/admin-orders';
import ShopImage from './shop-image';
import styles from './admin-orders.module.css';
type Order = CustomerOrder & { isGuest?: boolean; fulfillmentProgress?: OrderProgress | null; shipBy?: string | null; completedAt?: string | null };
async function api(path: string, update?: unknown) {
  const session = await fetchAuthSession(); const token = session.tokens?.accessToken.toString();
  if (!token) throw new Error('Admin sign-in required.');
  const response = await fetch(backendApiUrl(path), { method: update ? 'PUT' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(update ? { body: JSON.stringify(update) } : {}) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Orders could not be loaded.'); return result;
}
const dateLabel = (value: string) => new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]), [tab, setTab] = useState('new'), [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => { let active = true; setLoading(true); setError('');
    (async () => { const all: Order[] = []; let nextToken: string | null = null;
      do { const result = await api(`/admin/orders${nextToken ? `?nextToken=${encodeURIComponent(nextToken)}` : ''}`); all.push(...result.orders); nextToken = result.nextToken; } while (nextToken);
      if (active) { setOrders(all.sort((a,b) => b.createdAt.localeCompare(a.createdAt))); setSelected([]); }
    })().catch(cause => { if (active) setError(cause.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; };
  }, []);
  async function update(ids: string[], progress?: OrderProgress, shipBy?: string | null) {
    setBusy(true); setError('');
    try { for (const id of ids) { const current = orders.find(order => order.id === id)!; const result = await api(`/admin/orders/${encodeURIComponent(id)}`, { progress: progress ?? current.fulfillmentProgress ?? 'new', ...(shipBy !== undefined ? { shipBy } : {}) }); setOrders(previous => previous.map(order => order.id === id ? result.order : order)); setSelected(previous => previous.filter(value => value !== id)); } }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update orders.'); } finally { setBusy(false); }
  }
  const today = new Date(); const localToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const visible = orders.filter(order => (tab === 'completed') === (order.fulfillmentProgress === 'completed') && matchesShipDate(order.shipBy, filter, localToday));
  const groups = new Map<string, Order[]>();
  for (const order of visible) { const day = order.createdAt.slice(0,10); groups.set(day, [...(groups.get(day) ?? []), order]); }
  function select(ids: string[]) { setSelected(previous => ids.every(id => previous.includes(id)) ? previous.filter(id => !ids.includes(id)) : [...new Set([...previous, ...ids])]); }
  return <div className={styles.root}>
    <div className={styles.tabs} role="tablist" aria-label="Orders">{['new','completed'].map(value => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setSelected([]); }}>{value === 'new' ? 'New' : 'Completed'} <span>{orders.filter(order => (value === 'completed') === (order.fulfillmentProgress === 'completed')).length}</span></button>)}</div>
    {error && <p role="alert">{error}</p>}
    <div className={styles.layout}>
    <div role="tabpanel" aria-label={tab === 'new' ? 'New orders' : 'Completed orders'}>
      <div className={styles.toolbar}><span>{visible.length} orders{selected.length > 0 && ` · ${selected.length} selected`}</span>{selected.length > 0 && <button type="button" disabled={busy} onClick={() => update(selected, tab === 'new' ? 'completed' : 'new')}>{tab === 'new' ? 'Complete selected' : 'Move selected to New'}</button>}</div>
      {loading ? <p role="status">Loading orders…</p> : !visible.length ? <p>{error ? 'Orders could not be loaded. Reopen the Orders section to try again.' : 'No orders match this view.'}</p> : Array.from(groups, ([day, daily]) => <section className={styles.group} key={day}>
        <div className={styles.groupHeading}><strong>Ordered {dateLabel(day)}</strong><span>{daily.length}</span><button type="button" disabled={busy} onClick={() => select(daily.map(order => order.id))}>{daily.every(order => selected.includes(order.id)) ? 'Deselect all' : 'Select all'}</button></div>
        {daily.map(order => { const address = orderSummaryAddress(order.shippingAddress); const items = orderSummaryItems(order.items); const currency = /^[A-Z]{3}$/.test(order.currency) ? order.currency : 'USD'; const money = (value: number) => new Intl.NumberFormat('en-US',{style:'currency',currency}).format(value);
          return <article className={styles.order} key={order.id}>
            <input className={styles.checkbox} type="checkbox" aria-label={`Select order ${order.orderNumber}`} checked={selected.includes(order.id)} disabled={busy} onChange={() => select([order.id])} />
            <div><h3>{address?.recipient || 'Customer'} {order.isGuest && <small>(Guest)</small>}</h3><p className={styles.orderNumber}>{order.orderNumber} <span>{money(order.total)}</span></p><p>{order.isSample ? 'Sample order · ' : ''}{order.status === 'pending' ? 'Pending · unpaid' : order.status}</p>{!!order.discount && <p>Discount −{money(order.discount)}</p>}
              {items.map((item,index) => <div className={styles.item} key={`${item.id}-${index}`}>{item.image && <ShopImage src={item.image} alt={item.title} sizes="100px" />}<div><p>{item.title}</p><p>Quantity <strong>{item.quantity}</strong></p>{item.personalization && <p>Personalization: {item.personalization}</p>}</div></div>)}
              {!items.length && <p>Item details were not recorded.</p>}
            </div>
            <div className={styles.shipping}><strong>{order.shipBy ? `Ship by ${dateLabel(order.shipBy)}` : 'No ship-by estimate'}</strong><p>Ordered {dateLabel(order.createdAt)}</p><p>Shipping {order.shipping === 0 ? '(Free)' : typeof order.shipping === 'number' ? money(order.shipping) : 'not recorded'}</p><label className={styles.date}>Ship by<input type="date" aria-label={`Ship-by date for ${order.orderNumber}`} value={order.shipBy || ''} disabled={busy} onChange={event => update([order.id], undefined, event.target.value || null)} /></label>
              <details className={styles.address}><summary>Ship to</summary>{address ? <address>{address.recipient}<br />{address.line1}{address.line2 && <><br />{address.line2}</>}<br />{address.city}, {address.region} {address.postalCode}<br />{address.country}<br />{address.phone}</address> : <p>No address recorded.</p>}{order.email && <p>{order.email}</p>}</details>
            </div>
            <details className={styles.progress}><summary title="Update progress" aria-label={`Update progress for ${order.orderNumber}`}><svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 8a9 9 0 1 0 0 9M20 3v5h-5M8 12l3 3 5-6" /></svg><span>{progressLabel[order.fulfillmentProgress || 'new']}</span></summary><div>{orderProgress.map(value => <button key={value} type="button" disabled={busy || (order.fulfillmentProgress || 'new') === value} onClick={() => update([order.id],value)}>{value === 'completed' ? 'Complete order' : progressLabel[value]}</button>)}</div></details>
          </article>;
        })}
      </section>)}
    </div><aside className={styles.filters}><div><h2>Filters</h2><button type="button" onClick={() => setFilter('all')}>Reset</button></div><fieldset><legend>Ship by date</legend>{[['all','All'],['overdue','Overdue'],['today','Today'],['tomorrow','Tomorrow'],['week','Within a week'],['none','No estimate']].map(([value,label]) => <label key={value}><input type="radio" name="ship-filter" checked={filter === value} onChange={() => setFilter(value)} />{label}</label>)}</fieldset></aside></div>
  </div>;
}
