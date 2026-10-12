export type Shopping = { cart: { id: string; quantity: number }[]; favorites: string[] };
export const EMPTY_SHOPPING = '{"cart":[],"favorites":[]}';
export const SHOPPING_KEY = "shop-shopping-v1";
export function parseShopping(raw: string): Shopping {
  try {
    const value = JSON.parse(raw);
    const cart = new Map<string, number>();
    if (Array.isArray(value?.cart)) for (const item of value.cart) {
      if (typeof item?.id === "string" && item.id && Number.isInteger(item.quantity) && item.quantity > 0)
        cart.set(item.id, Math.min(99, item.quantity));
    }
    const favorites: string[] = Array.isArray(value?.favorites) ? value.favorites.filter((id: unknown): id is string => typeof id === "string" && !!id) : [];
    return { cart: [...cart].map(([id, quantity]) => ({ id, quantity })), favorites: [...new Set(favorites)] };
  } catch { return { cart: [], favorites: [] }; }
}
export function changeQuantity(state: Shopping, id: string, quantity: number): Shopping {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) throw new Error("Choose a quantity from 1 to 99.");
  return { ...state, cart: [...state.cart.filter(item => item.id !== id), ...(quantity ? [{ id, quantity }] : [])] };
}
