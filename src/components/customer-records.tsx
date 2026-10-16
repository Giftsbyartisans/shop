"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { formatAddressLabel, loadAddresses, saveAddress, deleteAddress, markDefaultAddress, loadOrders, type Address, type CustomerOrder, type AddressInput } from "@/lib/customer-records";
import styles from "./customer-auth.module.css";

const fields = [
  ["recipient", "Full name", "name", true], ["line1", "Street address", "address-line1", true],
  ["line2", "Apartment, suite, etc. (optional)", "address-line2", false], ["city", "City", "address-level2", true],
  ["region", "State / province (optional)", "address-level1", false], ["postalCode", "Postal code", "postal-code", true],
  ["country", "Country", "country-name", true], ["phone", "Mobile number", "tel", true],
] as const;

function OrderLinkArrow() {
  return <svg className={styles.orderLinkArrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg>;
}

export default function CustomerRecords({ section }: { section: "addresses" | "orders" }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [labelType, setLabelType] = useState<"home" | "office" | "custom">("home");
  const [removing, setRemoving] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    // Let effect cleanup cancel a discarded mount before starting network work.
    const request = Promise.resolve().then(async () => {
      if (!active) return;
      if (section === "addresses") {
        const data = await loadAddresses();
        if (active) setAddresses(data);
      } else {
        const data = await loadOrders();
        if (active) setOrders(data);
      }
    });
    request.catch(cause => { if (active) setError(cause instanceof Error ? cause.message : `Could not load your ${section === "addresses" ? "shipping addresses" : "orders"}. Please try again.`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [section, revision]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) || "").trim();
    const input: AddressInput = {
      recipient: value("recipient"), line1: value("line1"), line2: value("line2"),
      city: value("city"), region: value("region"), postalCode: value("postalCode"),
      country: value("country"), phone: value("phone"),
    };
    input.label = labelType === "custom" ? String(data.get("customLabel") || "").trim() : labelType;
    input.isDefault = data.get("isDefault") === "on";
    setBusy(true); setError(""); setNotice("");
    try {
      if (!input.label || input.label.length > 40) throw new Error("Enter an address label of up to 40 characters.");
      if (fields.some(([key, , , required]) => required && !input[key])) throw new Error("Complete all required address fields.");
      const result = await saveAddress(input, editing && editing !== "new" ? editing.id : undefined);
      setAddresses(current => [...current.filter(item => item.id !== result.id).map(item => result.isDefault ? { ...item, isDefault: false } : item), result]);
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
  async function setDefault(id: string) {
    setBusy(true); setError(""); setNotice("");
    try { await markDefaultAddress(id); setAddresses(current => current.map(item => ({ ...item, isDefault: item.id === id }))); setNotice("Default shipping address updated."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not set the default address."); }
    finally { setBusy(false); }
  }
  return <>
    <p className={styles.intro}>{section === "addresses" ? "Save your delivery details and manage your shipping addresses." : "View purchases recorded with your shop account. Purchases made on Etsy are managed in your Etsy account."}</p>
    {error && <p role="alert" className={`${styles.message} ${styles.error}`}>{error}</p>}
    {notice && <p role="status" className={styles.message}>{notice}</p>}
    {loading ? <p role="status">Loading {section === "addresses" ? "addresses" : "orders"}…</p> : error && !busy && !editing ? <button onClick={() => setRevision(value => value + 1)}>Try again</button> : section === "addresses" ? <>
      {editing ? <form className={styles.form} onSubmit={save} key={editing === "new" ? "new" : editing.id}>
        <h2>{editing === "new" ? "Add shipping address" : "Edit shipping address"}</h2>
        <fieldset className={styles.addressTags} disabled={busy}>
          <legend>Save as</legend>
          <label><input type="radio" name="label" value="home" checked={labelType === "home"} onChange={() => setLabelType("home")} />Home</label>
          <label><input type="radio" name="label" value="office" checked={labelType === "office"} onChange={() => setLabelType("office")} />Office</label>
          <label><input type="radio" name="label" value="custom" checked={labelType === "custom"} onChange={() => setLabelType("custom")} />Custom</label>
        </fieldset>
        {labelType === "custom" && <label htmlFor="address-custom-label">Custom name<input id="address-custom-label" name="customLabel" required maxLength={40} placeholder="e.g. Parents’ house" defaultValue={editing !== "new" && editing.label && !["home", "office"].includes(editing.label) ? editing.label : ""} disabled={busy} /></label>}
        {fields.map(([key, label, autoComplete, required]) => <label key={key} htmlFor={`address-${key}`}>{label}<input id={`address-${key}`} name={key} type={key === "phone" ? "tel" : "text"} autoComplete={autoComplete} required={required} maxLength={key === "phone" || key === "postalCode" ? 30 : 150} defaultValue={editing === "new" ? "" : editing[key] || ""} disabled={busy} /></label>)}
        <div className={styles.defaultOption}>
          <label className={styles.defaultAddress}><input type="checkbox" name="isDefault" aria-describedby="default-address-help" defaultChecked={editing !== "new" && Boolean(editing.isDefault)} disabled={busy} />Mark as default address</label>
          <small id="default-address-help">Selecting this replaces your current default address.</small>
        </div>
        <div className={styles.recordActions}><button type="submit" className="primary" disabled={busy}>{busy ? "Saving…" : "Save address"}</button><button type="button" disabled={busy} onClick={() => { setEditing(null); setError(""); }}>Cancel</button></div>
      </form> : <>
        {!addresses.length && <div className={styles.emptyState}><h2>No saved addresses yet</h2><p>Add a shipping address to keep your delivery details handy.</p></div>}
        <div className={styles.recordList}>{addresses.map(address => <article className={`${styles.recordCard} ${styles.addressCard}`} key={address.id}>
          {address.label && <span className={styles.addressTag}>{formatAddressLabel(address.label)}</span>}
          {address.isDefault && <span className={`${styles.addressTag} ${styles.defaultTag}`}>Default</span>}
          <h3>{address.recipient}</h3><address>{address.line1}<br />{address.line2 && <>{address.line2}<br /></>}{address.city}{address.region ? `, ${address.region}` : ""} {address.postalCode}<br />{address.country}{address.phone && <><br />{address.phone}</>}</address>
          {!address.isDefault && <button className={styles.markDefault} disabled={busy} onClick={() => setDefault(address.id)}>Mark as default</button>}
          <div className={styles.recordActions}>{removing === address.id ? <><span>Remove this address?</span><button disabled={busy} onClick={() => remove(address.id)}>Remove</button><button disabled={busy} onClick={() => setRemoving(null)}>Cancel</button></> : <><button disabled={busy} onClick={() => { setEditing(address); setLabelType(address.label === "office" ? "office" : !address.label || address.label === "home" ? "home" : "custom"); setError(""); setNotice(""); }}>Edit</button><button disabled={busy} onClick={() => setRemoving(address.id)}>Remove</button></>}</div>
        </article>)}</div>
        <button className="primary" disabled={busy} onClick={() => { setEditing("new"); setLabelType("home"); setError(""); setNotice(""); }}>Add shipping address</button>
      </>}
    </> : orders.length ? <div className={styles.recordList}>{orders.map(order => <article className={styles.recordCard} key={order.id}>
      <div className={styles.orderHeading}><h3><Link href={`/account/orders/${encodeURIComponent(order.id)}`} target="_blank" rel="noopener noreferrer">{order.isSample ? "Sample order" : "Order"} {order.orderNumber}</Link></h3><span className={`${styles.orderStatus}${order.status === "paid" ? ` ${styles.orderPaid}` : ""}`}>{order.status === "pending" ? "Pending · unpaid" : order.status || "pending"}</span></div>
      <p>{new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
      <p>Total: {new Intl.NumberFormat("en-US", { style: "currency", currency: /^[A-Z]{3}$/.test(order.currency) ? order.currency : "USD" }).format(order.total)}</p>
      <Link href={`/account/orders/${encodeURIComponent(order.id)}`} target="_blank" rel="noopener noreferrer" className={styles.orderSummaryLink}><span className={styles.orderSummaryLabel}>View full order summary <OrderLinkArrow /></span></Link>
      {order.trackingUrl?.startsWith("https://") && <Link href={order.trackingUrl} className={styles.orderTrackingLink} target="_blank" rel="noopener noreferrer">Track shipment <OrderLinkArrow /></Link>}
    </article>)}</div> : <div className={styles.emptyState}><h2>No orders yet</h2><p>Your shop orders will appear here when they are recorded.</p><Link href="/collection">Explore the collection →</Link></div>}
  </>;
}
