"use client";
import Link from "next/link";
import { checkoutRedirect, pendingOrderConfirmation } from "@/lib/checkout-navigation";
import { fetchUserAttributes } from "aws-amplify/auth";
import { checkoutEmail, checkoutAddress } from "@/lib/checkout-contact";
import { readGuestCheckout, saveGuestCheckout } from "@/lib/guest-checkout";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Listing } from "@/lib/catalog";
import { formatPrice } from "@/lib/catalog";
import { deliveryEstimate } from "@/lib/delivery-estimate";
import type { ShopContent } from "@/lib/content";
import { formatAddressLabel, loadAddresses, saveAddress, type Address, type AddressInput } from "@/lib/customer-records";
import { cartLineKey } from "@/lib/shopping";
import { useCart } from "./shopping-controls";
import { useCartTotals } from "./use-cart-totals";
import { useCartPlacement } from "./use-cart-placement";
import PayPalCheckout from "./paypal-checkout";
import ShopImage from "./shop-image";
const fields = [
  ["recipient", "Full name", "name", true], ["line1", "Street address", "address-line1", true],
  ["line2", "Apartment, suite, etc. (optional)", "address-line2", false], ["city", "City", "address-level2", true],
  ["region", "State / province (optional)", "address-level1", false], ["postalCode", "Postal code", "postal-code", true],
  ["country", "Country", "country-name", true], ["phone", "Mobile number", "tel", true],
] as const;
export default function Checkout({ step, listings, content, ready }: { step: "address" | "payment"; listings: Listing[]; content: ShopContent; ready: boolean }) {
  const cart = useCart();
  const router = useRouter();
  const [contactReadyKey, setContactReadyKey] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [email, setEmail] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  useEffect(() => { setEstimatedDelivery(deliveryEstimate(new Date())); }, []);
  const revisionKey = JSON.stringify({ listings, sale: [content.saleEnabled, content.salePercent] });
  const { totals, error: priceError } = useCartTotals(cart.items, ready && !cart.loading && !cart.error, revisionKey);
  const contactKey = JSON.stringify({ signedIn: cart.signedIn, step, revision });
  useEffect(() => {
    if (cart.loading) return;
    if (!cart.signedIn) {
      const draft = readGuestCheckout();
      if (draft) {
        setEmail(draft.email);
        setAddresses([{ id: "guest", label: draft.label, ...draft.address } as Address]); setAddressId("guest");
      }
      if (!draft) { setEmail(""); setAddresses([]); setAddressId(""); }
      setContactReadyKey(contactKey); setAdding(step === "address" && !draft); setLoading(false);
      return;
    }
    let active = true;
    setLoading(true); setError("");
    Promise.all([loadAddresses(), fetchUserAttributes()]).then(([result, attributes]) => {
      if (!active) return;
      const contactEmail = checkoutEmail(attributes.email);
      setEmail(contactEmail);
      setContactReadyKey(contactKey);
      setAddresses(result);
      if (step === "payment") setAddressId(new URLSearchParams(window.location.search).get("address") || "");
      else setAddressId(current => result.some(address => address.id === current) ? current : result.find(address => address.isDefault)?.id ?? result[0]?.id ?? "");
      setAdding(step === "address" && !result.length);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Could not load your shipping addresses."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cart.signedIn, cart.loading, step, revision, contactKey]);
  const selected = addresses.find(address => address.id === addressId);
  const addressSection = useRef<HTMLFieldSetElement>(null);
  useEffect(() => { if (addressSection.current) addressSection.current.scrollTop = 0; }, [addressId, adding]);
  const orderedAddresses = selected ? [selected, ...addresses.filter(address => address.id !== addressId)] : addresses;
  async function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const value = (key: string) => String(data.get(key) || "").trim();
      const input: AddressInput = {
        recipient: value("recipient"), line1: value("line1"), line2: value("line2"),
        city: value("city"), region: value("region"), postalCode: value("postalCode"),
        country: value("country"), phone: value("phone"),
      };
      input.label = String(data.get("label") || "").trim(); input.isDefault = data.get("isDefault") === "on";
      if (!input.label || input.label.length > 40 || fields.some(([key, , , required]) => required && !input[key])) throw new Error("Complete all required address fields.");
      const contactEmail = checkoutEmail(email);
      checkoutAddress(input);
      input.email = contactEmail;
      const address = cart.signedIn ? await saveAddress(input) : { ...input, id: "guest" };
      if (!cart.signedIn) saveGuestCheckout({ email: contactEmail, address: checkoutAddress(input), label: input.label || "Shipping address" });
      setAddresses(current => [...current.filter(item => item.id !== address.id).map(item => address.isDefault ? { ...item, isDefault: false } : item), address]);
      setAddressId(address.id); setAdding(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save your address."); }
    finally { setSaving(false); }
  }
  let validEmail = false;
  try { checkoutEmail(email); validEmail = true; } catch { /* Required before proceeding. */ }
  function nextStep() {
    try {
      const contactEmail = checkoutEmail(email);
      if (!selected) throw new Error("Choose a shipping address.");
      const address = checkoutAddress(selected);
      if (!cart.signedIn) saveGuestCheckout({ email: contactEmail, address, label: selected.label || "Shipping address" });
      router.push(`/checkout/payment?address=${encodeURIComponent(addressId)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Complete your contact and shipping details."); }
  }
  const placement = useCartPlacement(cart.cartId, ready && !cart.loading && !cart.error && cart.items.length > 0);
  let validAddress = false;
  try { checkoutAddress(selected); validAddress = true; } catch { /* Address step collects missing details. */ }
  const redirectTo = checkoutRedirect({ ready, cartLoading: cart.loading, cartError: !!cart.error, hasItems: !!cart.items.length, placed: placement.placed, payment: step === "payment", contactReady: contactReadyKey === contactKey && !loading, contactError: !!error, validContact: validEmail && validAddress }, pendingOrderConfirmation());
  useEffect(() => { if (redirectTo) router.replace(redirectTo); }, [redirectTo, router]);
  const heading = <h1>Checkout</h1>;
  if (redirectTo) return <main className="shop checkout-page">{heading}<p role="status">Redirecting…</p></main>;
  if (!ready || cart.loading) return <main className="shop checkout-page">{heading}<p role="status">Loading checkout…</p></main>;
  if (cart.error) return <main className="shop checkout-page">{heading}<p role="alert">{cart.error}</p><Link href="/cart">Return to cart</Link></main>;
  if (placement.checking) return <main className="shop checkout-page">{heading}<p role="status">Checking cart status…</p></main>;
  if (placement.error) return <main className="shop checkout-page">{heading}<p role="alert">{placement.error}</p><button type="button" onClick={placement.retry}>Try again</button></main>;
  if (!content.buyNowEnabled) return <main className="shop checkout-page">{heading}<p>Online ordering is currently unavailable.</p><Link href="/cart">Return to cart</Link></main>;
  if (!cart.items.length) return <main className="shop checkout-page">{heading}<p role="status">Returning to home…</p></main>;
  const catalog = new Map(listings.map(item => [item.id, item]));
  return <main className="shop checkout-page">{heading}<div className="checkout-layout">
    <section className="checkout-panel">
      {loading ? <p role="status">Loading shipping addresses…</p> : <>
        {error && <p role="alert">{error} <button type="button" onClick={() => setRevision(value => value + 1)}>Reload addresses</button></p>}
        {step === "address" ? <>
          <h2>Shipping address</h2>
          {!cart.signedIn && <label className="checkout-contact-email">Email address (required)<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>}
          {!cart.signedIn && <p className="muted">Continue as a guest, or <Link href="/login?next=%2Fcheckout%2Faddress">sign in to use your saved addresses</Link>.</p>}
          {addresses.length > 0 && !adding && <fieldset ref={addressSection} className={`checkout-addresses${addresses.length >= 3 ? " checkout-addresses-scroll" : ""}`} disabled={saving}><legend className="sr-only">Choose a saved shipping address</legend>{orderedAddresses.map(address => <label className={`checkout-address${address.id === addressId ? " selected" : ""}`} key={address.id}>
            <input type="radio" name="shippingAddress" checked={address.id === addressId} onChange={() => { setAddressId(address.id); setAdding(false); }} />
            <span><strong>{formatAddressLabel(address.label || "Shipping address")}{address.isDefault ? " · Default" : ""}</strong><span>{address.recipient}</span><span>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</span><span>{address.city}{address.region ? `, ${address.region}` : ""} {address.postalCode}</span><span>{address.country} · {address.phone}</span></span>
          </label>)}</fieldset>}
          {!adding && <button className="checkout-add-address" type="button" onClick={() => setAdding(true)}>+ Add a new address</button>}
          {adding && <form className="checkout-address-form" onSubmit={addAddress}><h3>Add a new address</h3><fieldset disabled={saving}>
            <label>Address label<input name="label" maxLength={40} required /></label>
            {fields.map(([key, label, autoComplete, required]) => <label key={key}>{label}<input name={key} autoComplete={autoComplete} type={key === "phone" ? "tel" : "text"} required={required} maxLength={key === "phone" || key === "postalCode" ? 30 : 150} /></label>)}
            {cart.signedIn && <label className="checkout-default"><input type="checkbox" name="isDefault" />Set as default address</label>}
            <div className="checkout-form-actions"><button className="primary" type="submit">{saving ? "Saving…" : "Save address"}</button>{addresses.length > 0 && <button type="button" onClick={() => setAdding(false)}>Cancel</button>}</div>
          </fieldset></form>}
        </> : <>
          <h2>Payment</h2>
          <p>Contact email: {email}</p>
          {selected ? <section className="checkout-deliver-to"><h3>Deliver to</h3><p>{selected.recipient}<br />{selected.line1}{selected.line2 ? `, ${selected.line2}` : ""}<br />{selected.city}, {selected.country} {selected.postalCode}</p><Link href="/checkout/address">Change address</Link></section> : <p>Select your shipping address before placing an order. <Link href="/checkout/address">Choose address →</Link></p>}
          <section className="checkout-payment-placeholder"><h3>PayPal</h3><p>Pay securely with PayPal using the button in your order summary.</p></section>
        </>}
      </>}
    </section>
    <aside className="shopping-summary checkout-summary"><h2>Order summary</h2><p className="shopping-delivery-estimate">Estimated delivery: {estimatedDelivery || "10–15 days"}</p><div className="checkout-summary-items">{cart.items.map(entry => {
      const item = catalog.get(entry.id), key = cartLineKey(entry), line = totals?.lines.find(value => value.key === key);
      return <article className="checkout-summary-item" key={key}>{item && <ShopImage src={item.images?.[0] || item.image} alt={item.title} sizes="64px" />}<div><h3>{item?.title || "Unavailable product"}</h3><p>Quantity: {entry.quantity}</p>{entry.personalization && <p className="checkout-personalization">Personalization: {entry.personalization}</p>}<p>{line ? formatPrice(line.total) : "—"}</p></div></article>;
    })}</div>
      {totals ? <><p className="shopping-summary-row"><span>MSRP</span><span>{formatPrice(totals.subtotal)}</span></p><p className="shopping-summary-row"><span>Discount</span><span>{totals.discount > 0 ? "−" : ""}{formatPrice(totals.discount)}</span></p><p className="shopping-summary-row"><span>Shipping charges</span><span>{totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}</span></p><p className="shopping-summary-row shopping-summary-total"><span>Total</span><span>{formatPrice(totals.total)}</span></p></> : <p role={priceError ? "alert" : "status"}>{priceError || "Calculating totals…"}</p>}
      {step === "address" ? <div className="checkout-next"><Link href="/cart">Back to cart</Link><button className="primary" type="button" disabled={loading || !selected || !validEmail || adding || saving || !totals} onClick={nextStep}>Next →</button></div> : <>{totals && selected && !loading && contactReadyKey === contactKey && validEmail && validAddress && <PayPalCheckout cartId={cart.cartId!} key={JSON.stringify({ cartId:cart.cartId, items: cart.items, addressId, total: totals.total, email, selected })} items={cart.items} addressId={addressId} total={totals.total} email={email} guestAddress={cart.signedIn ? undefined : checkoutAddress(selected)} enabled={content.buyNowEnabled} />}<Link href="/checkout/address">← Back to shipping address</Link></>}
    </aside>
  </div></main>;
}
