"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { loadAddresses, saveAddress, deleteAddress, loadOrders, type Address, type CustomerOrder, type AddressInput } from "@/lib/customer-records";
import styles from "./customer-auth.module.css";

const fields = [
  ["recipient", "Full name", "name", true], ["line1", "Street address", "address-line1", true],
  ["line2", "Apartment, suite, etc. (optional)", "address-line2", false], ["city", "City", "address-level2", true],
  ["region", "State / province (optional)", "address-level1", false], ["postalCode", "Postal code", "postal-code", true],
  ["country", "Country", "country-name", true], ["phone", "Phone (optional)", "tel", false],
] as const;

export default function CustomerRecords({ section }: { section: "addresses" | "orders" }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    const request = section === "addresses" ? loadAddresses().then(data => { if (active) setAddresses(data); }) : loadOrders().then(data => { if (active) setOrders(data); });
    request.catch(cause => { if (active) setError(cause instanceof Error ? cause.message : `Could not load your ${section === "addresses" ? "shipping addresses" : "orders"}. Please try again.`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [section, revision]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = Object.fromEntries(fields.map(([key]) => [key, String(data.get(key) || "").trim()])) as AddressInput;
    setBusy(true); setError(""); setNotice("");
    try {
      if (fields.some(([key, , , required]) => required && !input[key])) throw new Error("Complete all required address fields.");
      const result = await saveAddress(input, editing && editing !== "new" ? editing.id : undefined);
      setAddresses(current => [...current.filter(item => item.id !== result.id), result]);
      setEditing(null); setNotice("Shipping address saved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the address."); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    setBusy(true); setError(""); setNotice("");
    try { await deleteAddress(id); setAddresses(current => current.filter(item => item.id !== id)); setRemoving(null); setNotice("Shipping address removed."); }
    catch { setError("Could not remove the address. Please try again."); }
    finally { setBusy(false); }
  }
  return <>
    <p className={styles.intro}>{section === "addresses" ? "Save your delivery details and manage your shipping addresses." : "View purchases recorded with your shop account. Purchases made on Etsy are managed in your Etsy account."}</p>
    {error && <p role="alert" className={`${styles.message} ${styles.error}`}>{error}</p>}
    {notice && <p role="status" className={styles.message}>{notice}</p>}
    {loading ? <p role="status">Loading {section === "addresses" ? "addresses" : "orders"}…</p> : error && !busy && !editing ? <button onClick={() => setRevision(value => value + 1)}>Try again</button> : section === "addresses" ? <>
      {editing ? <form className={styles.form} onSubmit={save} key={editing === "new" ? "new" : editing.id}>
        <h2>{editing === "new" ? "Add shipping address" : "Edit shipping address"}</h2>
        {fields.map(([key, label, autoComplete, required]) => <label key={key} htmlFor={`address-${key}`}>{label}<input id={`address-${key}`} name={key} type={key === "phone" ? "tel" : "text"} autoComplete={autoComplete} required={required} maxLength={key === "phone" || key === "postalCode" ? 30 : 150} defaultValue={editing === "new" ? "" : editing[key] || ""} disabled={busy} /></label>)}
        <div className={styles.recordActions}><button type="submit" className="primary" disabled={busy}>{busy ? "Saving…" : "Save address"}</button><button type="button" disabled={busy} onClick={() => { setEditing(null); setError(""); }}>Cancel</button></div>
      </form> : <>
        {!addresses.length && <div className={styles.emptyState}><h2>No saved addresses yet</h2><p>Add a shipping address to keep your delivery details handy.</p></div>}
        <div className={styles.recordList}>{addresses.map(address => <article className={styles.recordCard} key={address.id}>
          <h3>{address.recipient}</h3><address>{address.line1}<br />{address.line2 && <>{address.line2}<br /></>}{address.city}{address.region ? `, ${address.region}` : ""} {address.postalCode}<br />{address.country}{address.phone && <><br />{address.phone}</>}</address>
          <div className={styles.recordActions}>{removing === address.id ? <><span>Remove this address?</span><button disabled={busy} onClick={() => remove(address.id)}>Remove</button><button disabled={busy} onClick={() => setRemoving(null)}>Cancel</button></> : <><button disabled={busy} onClick={() => { setEditing(address); setError(""); setNotice(""); }}>Edit</button><button disabled={busy} onClick={() => setRemoving(address.id)}>Remove</button></>}</div>
        </article>)}</div>
        <button className="primary" disabled={busy} onClick={() => { setEditing("new"); setError(""); setNotice(""); }}>Add shipping address</button>
      </>}
    </> : orders.length ? <div className={styles.recordList}>{orders.map(order => <article className={styles.recordCard} key={order.id}>
      <div className={styles.orderHeading}><h3>Order {order.orderNumber}</h3><span className={styles.orderStatus}>{order.status || "pending"}</span></div>
      <p>{new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
      <p>Total: {new Intl.NumberFormat("en-US", { style: "currency", currency: /^[A-Z]{3}$/.test(order.currency) ? order.currency : "USD" }).format(order.total)}</p>
      {order.trackingUrl?.startsWith("https://") && <Link href={order.trackingUrl} target="_blank" rel="noopener noreferrer">Track shipment ↗</Link>}
    </article>)}</div> : <div className={styles.emptyState}><h2>No orders yet</h2><p>Your shop orders will appear here when they are recorded.</p><Link href="/collection">Explore the collection →</Link></div>}
  </>;
}
