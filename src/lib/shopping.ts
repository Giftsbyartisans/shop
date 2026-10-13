export type CartItem = { id: string; quantity: number; personalization?: string };
export type Shopping = { cart: CartItem[]; favorites: string[] };
export function cartLineKey(item: Pick<CartItem, "id" | "personalization">) { return item.personalization ? JSON.stringify([item.id, item.personalization]) : item.id; }
export function addCartItem(state: Shopping, id: string, text = "", quantity = 1): Shopping {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error("Choose a quantity from 1 to 99.");
  const personalization = text.trim();
  if (personalization.length > 1024) throw new Error("Personalization must be 1024 characters or fewer.");
  const line: CartItem = { id, quantity, ...(personalization ? { personalization } : {}) };
  const key = cartLineKey(line);
  const existing = state.cart.find(item => cartLineKey(item) === key);
  if ((existing?.quantity || 0) + quantity > 99) throw new Error("Choose a quantity from 1 to 99.");
  return { ...state, cart: [...state.cart.filter(item => cartLineKey(item) !== key), { ...line, quantity: (existing?.quantity || 0) + quantity }] };
}
export const EMPTY_SHOPPING = '{"cart":[],"favorites":[]}';
export const SHOPPING_KEY = "shop-shopping-v1";
export function mergeCarts(account: Shopping["cart"], guest: Shopping["cart"]): Shopping["cart"] {
  const merged = new Map(account.map(item => [cartLineKey(item), item]));
  for (const item of guest) merged.set(cartLineKey(item), { ...item, quantity: Math.max(merged.get(cartLineKey(item))?.quantity || 0, item.quantity) });
  return [...merged.values()];
}
export function parseShopping(raw: string): Shopping {
  try {
    const value = JSON.parse(raw);
    const cart = new Map<string, CartItem>();
    if (Array.isArray(value?.cart)) for (const item of value.cart) {
      if (typeof item?.id === "string" && item.id && Number.isInteger(item.quantity) && item.quantity > 0)
        { const line: CartItem = { id: item.id, quantity: Math.min(99, item.quantity), ...(typeof item.personalization === "string" && item.personalization.trim() ? { personalization: item.personalization.trim().slice(0, 1024) } : {}) }; cart.set(cartLineKey(line), line); }
    }
    const favorites: string[] = Array.isArray(value?.favorites) ? value.favorites.filter((id: unknown): id is string => typeof id === "string" && !!id) : [];
    return { cart: [...cart.values()], favorites: [...new Set(favorites)] };
  } catch { return { cart: [], favorites: [] }; }
}
export function changeQuantity(state: Shopping, id: string, quantity: number): Shopping {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) throw new Error("Choose a quantity from 1 to 99.");
  const existing = state.cart.find(item => cartLineKey(item) === id);
  return { ...state, cart: [...state.cart.filter(item => cartLineKey(item) !== id), ...(quantity ? [{ ...(existing || { id }), quantity }] : [])] };
}
