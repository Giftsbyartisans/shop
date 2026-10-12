"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { changeQuantity, EMPTY_SHOPPING, parseShopping, SHOPPING_KEY, type Shopping } from "@/lib/shopping";
import { favoritesSnapshot, favoritesServerSnapshot, subscribeFavorites, setFavorite } from "@/lib/favorites-store";
export function useFavorites() { return useSyncExternalStore(subscribeFavorites, favoritesSnapshot, favoritesServerSnapshot); }

function subscribe(callback: () => void) {
  window.addEventListener("shop-shopping", callback); window.addEventListener("storage", callback);
  return () => { window.removeEventListener("shop-shopping", callback); window.removeEventListener("storage", callback); };
}
function snapshot() { try { return localStorage.getItem(SHOPPING_KEY) || EMPTY_SHOPPING; } catch { return EMPTY_SHOPPING; } }
export function updateShopping(update: (state: Shopping) => Shopping) {
  localStorage.setItem(SHOPPING_KEY, JSON.stringify(update(parseShopping(snapshot()))));
  window.dispatchEvent(new Event("shop-shopping"));
}
export function useShopping() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => EMPTY_SHOPPING);
  const favorites = useFavorites();
  return useMemo(() => ({ ...parseShopping(raw), favorites: favorites.ids }), [raw, favorites.ids]);
}
export function ShoppingIcon({ kind }: { kind: "cart" | "favorites" }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind === "favorites" ? <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /> : <><path d="M3 3h2l3 13h11l3-9H6" /><circle cx="9" cy="21" r="1" /><circle cx="19" cy="21" r="1" /></>}</svg>;
}
export function ShoppingLinks() {
  const state = useShopping();
  return <div className="shopping-header-links">{(["favorites", "cart"] as const).map(kind => {
    const count = kind === "cart" ? state.cart.reduce((sum, item) => sum + item.quantity, 0) : state.favorites.length;
    return <Link key={kind} href={`/${kind}`} aria-label={`${kind === "cart" ? "Cart" : "Favorites"}, ${count} items`} title={kind === "cart" ? "Cart" : "Favorites"}><ShoppingIcon kind={kind} />{count > 0 && <span className="shopping-count">{count}</span>}</Link>;
  })}</div>;
}
export function ProductShopping({ id, compact = false, mode = "both" }: { id: string; compact?: boolean; mode?: "both" | "favorite" | "cart" }) {
  const state = useShopping();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const favorites = useFavorites();
  const favorite = state.favorites.includes(id);
  async function act(kind: "cart" | "favorite") {
    setError("");
    setBusy(true);
    try {
      if (kind === "favorite") await setFavorite(id, !favorite);
      else updateShopping(current => changeQuantity(current, id, (current.cart.find(item => item.id === id)?.quantity || 0) + 1));
      setNotice(kind === "cart" ? "Added to cart" : favorite ? "Removed from favorites" : "Saved to favorites");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this item. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className={`product-shopping${compact ? " compact" : ""}`}>
    {mode !== "favorite" && <button onClick={() => act("cart")} className={compact ? "" : "primary"}>Add to cart</button>}
    {mode !== "cart" && <button disabled={busy || favorites.loading} onClick={() => act("favorite")} aria-pressed={favorite} aria-label={`${favorite ? "Remove from" : "Save to"} favorites`} title={favorite ? "Remove from favorites" : "Save to favorites"}><ShoppingIcon kind="favorites" />{!compact && (favorite ? "Saved" : "Favorite")}</button>}
    <span role="status" className="shopping-notice">{error || notice}</span>
  </div>;
}
