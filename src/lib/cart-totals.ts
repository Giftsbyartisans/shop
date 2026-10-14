import { listingPrice, type Listing } from "./catalog";
import { resolvePersonalization } from "./personalization";
import type { ShopContent } from "./content";
import { cartLineKey, type CartItem } from "./shopping";
export type CartTotals = { subtotal: number; discount: number; shipping: number; total: number; currency: "USD"; lines: { key: string; total: number }[] };
export function calculateCartTotals(items: CartItem[], listings: Listing[], content: ShopContent): CartTotals {
  const catalog = new Map(listings.map(item => [item.id, resolvePersonalization(item, content)]));
  let original = 0, payable = 0;
  const lines = items.map(entry => {
    const item = catalog.get(entry.id);
    if (!item?.published) throw new Error("A cart product is no longer available. Remove it before continuing.");
    if (!Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > 99) throw new Error("Invalid cart quantity.");
    if (entry.personalization && !item.personalizationEnabled) throw new Error("Personalization is no longer available for a cart product.");
    const fee = entry.personalization ? Math.round((item.personalizationPrice ?? 0) * 100) : 0;
    const price = Math.round(listingPrice(item, content.saleEnabled, content.salePercent) * 100);
    if (!Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(fee) || fee < 0) throw new Error("Invalid catalog pricing.");
    original += (Math.round(item.price * 100) + fee) * entry.quantity;
    const total = (price + fee) * entry.quantity; payable += total;
    return { key: cartLineKey(entry), total: total / 100 };
  });
  return { subtotal: original / 100, discount: (original - payable) / 100, shipping: 0, total: payable / 100, currency: "USD", lines };
}
