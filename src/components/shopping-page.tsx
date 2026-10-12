"use client";
import Link from "next/link";
import { useState } from "react";
import type { Listing } from "@/lib/catalog";
import { formatPrice, listingPrice } from "@/lib/catalog";
import type { ShopContent } from "@/lib/content";
import { changeQuantity } from "@/lib/shopping";
import { ProductShopping, updateShopping, useShopping, useFavorites } from "./shopping-controls";
import { setFavorite, refreshFavorites } from "@/lib/favorites-store";
import ShopImage from "./shop-image";

export default function ShoppingPage({ kind, listings, content, ready, loadError }: { kind: "cart" | "favorites"; listings: Listing[]; content: ShopContent; ready: boolean; loadError?: string }) {
  const state = useShopping();
  const favorites = useFavorites();
  if (kind === "favorites" && (favorites.loading || favorites.error)) ready = false;
  const [error, setError] = useState("");
  const selected = kind === "cart" ? state.cart : state.favorites.map(id => ({ id, quantity: 1 }));
  const catalog = new Map(listings.filter(item => item.published).map(item => [item.id, item]));
  const total = selected.reduce((sum, entry) => { const item = catalog.get(entry.id); return sum + (item ? Math.round(listingPrice(item, content.saleEnabled, content.salePercent) * 100) * entry.quantity : 0); }, 0) / 100;
  function quantity(id: string, value: number) {
    try { updateShopping(current => changeQuantity(current, id, value)); setError(""); }
    catch { setError("Could not update your cart. Choose a quantity from 1 to 99 and check browser storage is enabled."); }
  }
  async function remove(id: string) {
    try { if (kind === "favorites") await setFavorite(id, false); else updateShopping(current => changeQuantity(current, id, 0)); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove this item."); }
  }
  return <main className="shop shopping-page">
    <h1>{kind === "cart" ? "Your cart" : "Your favorites"}</h1>
    <p className="muted">{kind === "favorites" && favorites.signedIn ? "Favorites are saved to your account." : "Saved in this browser."} Prices reflect the current shop catalog.</p>
    {kind === "favorites" && favorites.loading && <p role="status">Loading favorites…</p>}
    {kind === "favorites" && favorites.error && <p role="alert">{favorites.error} <button onClick={() => refreshFavorites()}>Try again</button></p>}
    {error && <p role="alert">{error}</p>}
    {loadError && <p role="alert">Products or shop settings could not be loaded. Refresh the page to try again.</p>}
    {!ready ? <p role="status">Loading products…</p> : !selected.length ? <div className="shopping-empty"><h2>{kind === "cart" ? "Your cart is empty" : "No favorites yet"}</h2><p>{kind === "cart" ? "Find something thoughtful and add it to your cart." : "Save the pieces you love to find them here."}</p><Link href="/collection">Explore the collection →</Link></div> : <div className="shopping-layout"><div className="shopping-items">{selected.map(entry => {
      const item = catalog.get(entry.id);
      return <article className="shopping-item" key={entry.id}>
        {item && <Link href={`/listing/${encodeURIComponent(item.id)}`}><ShopImage src={item.images?.[0] || item.image} alt={item.title} sizes="120px" /></Link>}
        <div><h2>{item ? <Link href={`/listing/${encodeURIComponent(item.id)}`}>{item.title}</Link> : "Product no longer available"}</h2>
          {item && <p>{formatPrice(listingPrice(item, content.saleEnabled, content.salePercent))}</p>}
          {kind === "cart" && item && <label className="shopping-quantity">Quantity<select aria-label={`Quantity for ${item.title}`} value={entry.quantity} onChange={event => quantity(entry.id, Number(event.target.value))}>{Array.from({ length: 99 }, (_, index) => <option key={index + 1}>{index + 1}</option>)}</select></label>}
          {kind === "favorites" && item && <ProductShopping id={item.id} compact />}
          <button className="shopping-remove" onClick={() => remove(entry.id)}>Remove</button>
        </div>
        {kind === "cart" && item && <strong>{formatPrice(Math.round(listingPrice(item, content.saleEnabled, content.salePercent) * 100) * entry.quantity / 100)}</strong>}
      </article>;
    })}</div>{kind === "cart" && <aside className="shopping-summary"><h2>Order summary</h2><p><span>Subtotal</span><strong>{formatPrice(total)}</strong></p><p className="muted">Checkout is coming soon. You can still purchase individual products through their Etsy links.</p><Link href="/collection">Continue shopping →</Link></aside>}</div>}
  </main>;
}
