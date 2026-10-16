"use client";
import { listingPath } from "@/lib/listing-url";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartPlacement } from "./use-cart-placement";
import BuyNow from "./buy-now";
import { useCartTotals } from "./use-cart-totals";
import { useEffect, useState } from "react";
import { deliveryEstimate } from "@/lib/delivery-estimate";
import type { Listing } from "@/lib/catalog";
import { formatPrice, listingPrice } from "@/lib/catalog";
import type { ShopContent } from "@/lib/content";
import { cartLineKey, changeQuantity, type CartItem } from "@/lib/shopping";
import { ProductShopping, updateShopping, useShopping, useFavorites, useCart } from "./shopping-controls";
import { refreshCart } from "@/lib/cart-store";
import { setFavorite, refreshFavorites } from "@/lib/favorites-store";
import ShopImage from "./shop-image";
import { resolvePersonalization } from "@/lib/personalization";

export default function ShoppingPage({ kind, listings, content, ready, loadError }: { kind: "cart" | "favorites"; listings: Listing[]; content: ShopContent; ready: boolean; loadError?: string }) {
  const router = useRouter();
  const state = useShopping();
  const favorites = useFavorites();
  const cart = useCart();
  if (kind === "cart" && (cart.loading || cart.error)) ready = false;
  if (kind === "favorites" && (favorites.loading || favorites.error)) ready = false;
  const [clearingCart, setClearingCart] = useState(false);
  const [error, setError] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  useEffect(() => { setEstimatedDelivery(deliveryEstimate(new Date())); }, []);
  const selected: CartItem[] = kind === "cart" ? state.cart : state.favorites.map(id => ({ id, quantity: 1 }));
  const placement = useCartPlacement(cart.cartId, kind === "cart" && !cart.loading && !cart.error && cart.items.length > 0);
  const emptyCart = kind === "cart" && !cart.loading && !cart.error && !selected.length;
  useEffect(() => { if (placement.placed) router.replace("/"); }, [placement.placed, router]);
  const catalog = new Map(listings.filter(item => item.published).map(item => [item.id, resolvePersonalization(item, content)]));
  const cartKey = JSON.stringify({ items: selected, sale: [content.saleEnabled, content.salePercent], listings });
  const { totals: cartTotals, error: cartError } = useCartTotals(selected, kind === "cart" && ready, cartKey);
  async function quantity(id: string, value: number) {
    try { await updateShopping(current => changeQuantity(current, id, value)); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update your cart."); }
  }
  async function remove(id: string) {
    try { if (kind === "favorites") await setFavorite(id, false); else await updateShopping(current => changeQuantity(current, id, 0)); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove this item."); }
  }
  async function clearEntireCart() {
    if (clearingCart) return;
    setClearingCart(true); setError("");
    try {
      await updateShopping(current => ({ ...current, cart: [] }));
      try { sessionStorage.removeItem("shop-paypal-intent"); sessionStorage.removeItem("shop-pending-order"); } catch { /* Cart data is already cleared. */ }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not empty your cart. Please retry."); }
    finally { setClearingCart(false); }
  }
  const emptyCartButton = <button type="button" disabled={clearingCart || cart.loading || !!cart.error || placement.checking} onClick={clearEntireCart}>{clearingCart ? "Emptying cart…" : "Empty cart"}</button>;
  if (emptyCart) return <main className="shop shopping-page cart-empty-page">
    <svg className="cart-empty-icon" width="128" height="128" viewBox="0 0 128 128" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 25h14l13 57a8 8 0 0 0 8 6h48M34 41h77l-10 31a7 7 0 0 1-7 5H41" />
      <path d="M58 51v15M77 51v15M96 51l-3 15" strokeWidth="2.5" />
      <circle cx="51" cy="102" r="7" /><circle cx="94" cy="102" r="7" />
    </svg>
    <h1>Your shopping cart is empty</h1>
    <Link className="primary cart-empty-continue" href="/collection">Explore our collection</Link>
  </main>;
  if (placement.error && kind === "cart") return <main className="shop shopping-page"><p role="alert">{placement.error}</p>{error && <p role="alert">{error}</p>}<button type="button" onClick={placement.retry}>Try again</button>{emptyCartButton}</main>;
  if (placement.placed) return <main className="shop shopping-page"><p role="status">Returning to home…</p></main>;
  return <main className={`shop shopping-page${kind === "favorites" ? " favorites-page" : ""}`}>
    <div className="shopping-page-heading"><h1>{kind === "cart" ? "Your cart" : "Your favorites"}</h1>{kind === "cart" && selected.length > 0 && emptyCartButton}</div>
    {kind === "favorites" && <p className="muted">{favorites.signedIn ? "Favorites are saved to your account." : "Saved in this browser."} Prices reflect the current shop catalog.</p>}
    {kind === "cart" && cart.error && <p role="alert">{cart.error} <button onClick={() => refreshCart()}>Try again</button></p>}
    {kind === "favorites" && favorites.loading && <p role="status">Loading favorites…</p>}
    {kind === "favorites" && favorites.error && <p role="alert">{favorites.error} <button onClick={() => refreshFavorites()}>Try again</button></p>}
    {error && <p role="alert">{error}</p>}
    {loadError && <p role="alert">Products or shop settings could not be loaded. Refresh the page to try again.</p>}
    {!ready && !emptyCart ? <p role="status">Loading products…</p> : !selected.length ? <div className="shopping-empty"><h2>{kind === "cart" ? "Your cart is empty" : "No favorites yet"}</h2><p>{kind === "cart" ? "Find something thoughtful and add it to your cart." : "Save the pieces you love to find them here."}</p><Link href="/collection">Explore the collection →</Link></div> : <div className="shopping-layout"><div className="shopping-items">{selected.map(entry => {
      const item = catalog.get(entry.id);
      const lineKey = cartLineKey(entry);
      const fee = item && entry.personalization ? item.personalizationPrice ?? 0 : 0;
      const price = item ? listingPrice(item, content.saleEnabled, content.salePercent) : 0;
      const discounted = Boolean(item && price < item.price);
      const percentOff = item && item.price > 0 ? Math.round((1 - price / item.price) * 100) : 0;
      return <article className="shopping-item" key={lineKey}>
        {item && <Link href={listingPath(item)}><ShopImage src={item.images?.[0] || item.image} alt={item.title} sizes="120px" /></Link>}
        <div><h2>{item ? <Link href={listingPath(item)}>{item.title}</Link> : "Product no longer available"}</h2>
          {item && <p className="shopping-item-price"><strong>{formatPrice(price)}</strong>{discounted && <><del>{formatPrice(item.price)}</del><span className="shopping-sale-tag">{percentOff}% off</span></>}{kind === "cart" && <Link className="free-delivery" href="/policies/delivery">Free delivery</Link>}</p>}
          {entry.personalization && <div className="cart-personalization-preview"><strong>Personalization {fee > 0 ? `(+${formatPrice(fee)} per item)` : "(free)"}</strong><p>{entry.personalization}</p></div>}
          {kind === "cart" && item && <label className="shopping-quantity">Quantity<select disabled={clearingCart || placement.checking} aria-label={`Quantity for ${item.title}`} value={entry.quantity} onChange={event => quantity(lineKey, Number(event.target.value))}>{Array.from({ length: 99 }, (_, index) => <option key={index + 1}>{index + 1}</option>)}</select></label>}
          {kind === "cart" && item && <p className="shopping-delivery-estimate">Estimated delivery: {estimatedDelivery || "10–15 days"}</p>}
          {kind === "favorites" && item && <ProductShopping id={item.id} compact cartLabel="Move to cart" />}
        </div>
        <div className="shopping-item-actions">
          {kind === "cart" && item && <strong>{cartTotals ? formatPrice(cartTotals.lines.find(line => line.key === lineKey)?.total ?? 0) : "—"}</strong>}
          <button disabled={clearingCart || placement.checking} className="shopping-remove" onClick={() => remove(kind === "cart" ? lineKey : entry.id)} aria-label={`Remove ${item?.title || "unavailable product"} from ${kind}`} title="Remove product">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" /></svg>
          </button>
        </div>
      </article>;
    })}</div>{kind === "cart" && <aside className="shopping-summary"><h2>Order summary</h2>
      {cartTotals ? <><p className="shopping-summary-row"><span>MSRP</span><strong>{formatPrice(cartTotals.subtotal)}</strong></p>
      <p className="shopping-summary-row"><span>Discount</span><strong>{cartTotals.discount > 0 ? "−" : ""}{formatPrice(cartTotals.discount)}</strong></p>
      <p className="shopping-summary-row"><span>Shipping charges</span><strong>{cartTotals.shipping === 0 ? "Free" : formatPrice(cartTotals.shipping)}</strong></p>
      <p className="shopping-summary-row shopping-summary-total"><span>Total</span><strong>{formatPrice(cartTotals.total)}</strong></p></> : <p role={cartError ? "alert" : "status"}>{cartError || "Calculating totals…"}</p>}
      <BuyNow enabled={content.buyNowEnabled} ready={Boolean(cartTotals) && !placement.checking && !placement.placed} /></aside>}</div>}
  </main>;
}
