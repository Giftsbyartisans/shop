import { checkoutEmail, checkoutAddress } from "./checkout-contact";
export const GUEST_CHECKOUT_KEY = "shop-guest-checkout";
export type GuestCheckout = { email: string; address: Record<string, string>; label: string };
export function readGuestCheckout(): GuestCheckout | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(GUEST_CHECKOUT_KEY) || "null");
    if (!value) return null;
    return { email: checkoutEmail(value.email), address: checkoutAddress(value.address), label: typeof value.label === "string" ? value.label : "Shipping address" };
  } catch { return null; }
}
export function saveGuestCheckout(value: GuestCheckout) {
  sessionStorage.setItem(GUEST_CHECKOUT_KEY, JSON.stringify(value));
}
