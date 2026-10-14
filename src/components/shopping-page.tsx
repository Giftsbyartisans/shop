"use client";
import Link from "next/link";
import OrderNow from "./order-now";
import { backendApiUrl } from "@/lib/backend-api";
import type { CartTotals } from "@/lib/cart-totals";
import { useEffect, useState } from "react";
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
  const state = useShopping();
  const favorites = useFavorites();
  const cart = useCart();
  if (kind === "cart" && (cart.loading || cart.error)) ready = false;
  if (kind === "favorites" && (favorites.loading || favorites.error)) ready = false;
  const [error, setError] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const selected: CartItem[] = kind === "cart" ? state.cart : state.favorites.map(id => ({ id, quantity: 1 }));
  const catalog = new Map(listings.filter(item => item.published).map(item => [item.id, resolvePersonalization(item, content)]));
  const cartKey = JSON.stringify({ items: selected, sale: [content.saleEnabled, content.salePercent], listings });
  const [savedCartTotals, setCartTotals] = useState<{ key: string; cartTotals: CartTotals } | null>(null);
  const [cartError, setCartError] = useState("");
  const cartTotals = savedCartTotals?.key === cartKey ? savedCartTotals.cartTotals : null;
  useEffect(() => {
    if (kind !== "cart" || !ready || !selected.length) return;
    const controller = new AbortController();
    setCartError("");
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(backendApiUrl("/cart"), { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: JSON.parse(cartKey).items }), signal: controller.signal });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Could not load cart prices.");
          if (!controller.signal.aborted) setCartTotals({ key: cartKey, cartTotals: result });
        } catch (cause) {
          if (!controller.signal.aborted) setCartError(cause instanceof Error ? cause.message : "Could not load cart prices.");
        }
      })();
    }, 150);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [kind, ready, cartKey]);
  async function quantity(id: string, value: number) {
    try { await updateShopping(current => changeQuantity(current, id, value)); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update your cart."); }
  }
  async function remove(id: string) {
    try { if (kind === "favorites") await setFavorite(id, false); else await updateShopping(current => changeQuantity(current, id, 0)); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove this item."); }
  }
  return <main className="shop shopping-page">
    <h1>{kind === "cart" ? "Your cart" : "Your favorites"}</h1>
    {orderNumber && <p role="status">Order {orderNumber} placed. Payment pending. <Link href="/account?section=orders">View your orders →</Link></p>}
    {kind === "favorites" && <p className="muted">{favorites.signedIn ? "Favorites are saved to your account." : "Saved in this browser."} Prices reflect the current shop catalog.</p>}
    {kind === "cart" && cart.error && <p role="alert">{cart.error} <button onClick={() => refreshCart()}>Try again</button></p>}
    {kind === "favorites" && favorites.loading && <p role="status">Loading favorites…</p>}
    {kind === "favorites" && favorites.error && <p role="alert">{favorites.error} <button onClick={() => refreshFavorites()}>Try again</button></p>}
    {error && <p role="alert">{error}</p>}
    {loadError && <p role="alert">Products or shop settings could not be loaded. Refresh the page to try again.</p>}
    {!ready ? <p role="status">Loading products…</p> : !selected.length ? <div className="shopping-empty"><h2>{kind === "cart" ? "Your cart is empty" : "No favorites yet"}</h2><p>{kind === "cart" ? "Find something thoughtful and add it to your cart." : "Save the pieces you love to find them here."}</p><Link href="/collection">Explore the collection →</Link></div> : <div className="shopping-layout"><div className="shopping-items">{selected.map(entry => {
      const item = catalog.get(entry.id);
      const lineKey = cartLineKey(entry);
      const fee = item && entry.personalization ? item.personalizationPrice ?? 0 : 0;
      const price = item ? listingPrice(item, content.saleEnabled, content.salePercent) : 0;
      const discounted = Boolean(item && price < item.price);
      const percentOff = item && item.price > 0 ? Math.round((1 - price / item.price) * 100) : 0;
      return <article className="shopping-item" key={lineKey}>
        {item && <Link href={`/listing/${encodeURIComponent(item.id)}`}><ShopImage src={item.images?.[0] || item.image} alt={item.title} sizes="120px" /></Link>}
        <div><h2>{item ? <Link href={`/listing/${encodeURIComponent(item.id)}`}>{item.title}</Link> : "Product no longer available"}</h2>
          {item && <p className="shopping-item-price"><strong>{formatPrice(price)}</strong>{discounted && <><del>{formatPrice(item.price)}</del><span className="shopping-sale-tag">{percentOff}% off</span></>}{kind === "cart" && <Link className="free-delivery" href="/policies/delivery">Free delivery</Link>}</p>}
          {entry.personalization && <div className="cart-personalization-preview"><strong>Personalization {fee > 0 ? `(+${formatPrice(fee)} per item)` : "(free)"}</strong><p>{entry.personalization}</p></div>}
          {kind === "cart" && item && <label className="shopping-quantity">Quantity<select aria-label={`Quantity for ${item.title}`} value={entry.quantity} onChange={event => quantity(lineKey, Number(event.target.value))}>{Array.from({ length: 99 }, (_, index) => <option key={index + 1}>{index + 1}</option>)}</select></label>}
          {kind === "favorites" && item && <ProductShopping id={item.id} compact />}
        </div>
        <div className="shopping-item-actions">
          {kind === "cart" && item && <strong>{cartTotals ? formatPrice(cartTotals.lines.find(line => line.key === lineKey)?.total ?? 0) : "—"}</strong>}
          <button className="shopping-remove" onClick={() => remove(kind === "cart" ? lineKey : entry.id)} aria-label={`Remove ${item?.title || "unavailable product"} from ${kind}`} title="Remove product">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" /></svg>
          </button>
        </div>
      </article>;
    })}</div>{kind === "cart" && <aside className="shopping-summary"><h2>Order summary</h2>
      {cartTotals ? <><p className="shopping-summary-row"><span>MSRP</span><strong>{formatPrice(cartTotals.subtotal)}</strong></p>
      <p className="shopping-summary-row"><span>Discount</span><strong>{cartTotals.discount > 0 ? "−" : ""}{formatPrice(cartTotals.discount)}</strong></p>
      <p className="shopping-summary-row"><span>Shipping charges</span><strong>{cartTotals.shipping === 0 ? "Free" : formatPrice(cartTotals.shipping)}</strong></p>
      <p className="shopping-summary-row shopping-summary-total"><span>Total</span><strong>{formatPrice(cartTotals.total)}</strong></p></> : <p role={cartError ? "alert" : "status"}>{cartError || "Calculating totals…"}</p>}
      {cartTotals && <OrderNow key={cartKey} items={selected} total={cartTotals.total} signedIn={cart.signedIn} enabled={content.buyNowEnabled} onPlaced={setOrderNumber} />}<Link href="/collection">Continue shopping →</Link></aside>}</div>}
  </main>;
}
