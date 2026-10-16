"use client";
import "./customer-auth";
import { nextCartId, validCartId } from "./cart-identity";
import { accountCart } from "./account-shopping-api";
import { getCurrentUser } from "aws-amplify/auth";
import { fetchTokenSession } from "@/lib/auth-session";
import { Hub } from "aws-amplify/utils";
import { cartLineKey, EMPTY_SHOPPING, mergeCarts, parseShopping, SHOPPING_KEY, type Shopping } from "./shopping";

type State = { cartId: string | null; items: Shopping["cart"]; signedIn: boolean; loading: boolean; error: string };
const initial: State = { cartId: null, items: [], signedIn: false, loading: true, error: "" };
let state = initial;
let userId: string | null = null;
let exists = false;
let started = false;
let generation = 0;
let pending: Promise<void> | null = null;
let writes: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();
function emit(next: State) { state = next; for (const listener of listeners) listener(); }
function guestState() {
  let saved: Shopping;
  try { saved = parseShopping(localStorage.getItem(SHOPPING_KEY) || EMPTY_SHOPPING); } catch { saved = parseShopping(EMPTY_SHOPPING); }
  if (!validCartId(saved.cartId)) { saved.cartId = crypto.randomUUID(); try { localStorage.setItem(SHOPPING_KEY,JSON.stringify(saved)); } catch { /* In-memory identity remains available. */ } }
  return saved;
}
function model() { return accountCart; }
function check(result: { errors?: readonly { message: string }[] }) { if (result.errors?.length) throw new Error("Could not sync your cart. Please try again."); }
function decode(items: unknown) { return parseShopping(JSON.stringify({ cart: typeof items === "string" ? JSON.parse(items) : items })).cart; }
async function persist(id: string, items: Shopping["cart"], hasRecord: boolean, cartId: string) {
  const result = hasRecord ? await model().update({ id, cartId, items: JSON.stringify(items) }) : await model().create({ id, cartId, items: JSON.stringify(items) });
  check(result); if (!result.data) throw new Error("Could not save your cart.");
}
async function initialize() {
  const run = ++generation;
  emit({ cartId: null, items: [], signedIn: false, loading: true, error: "" });
  try {
    const session = await fetchTokenSession();
    if (run !== generation) return;
    if (!session.tokens) { userId = null; exists = false; const guest = guestState(); emit({ cartId: guest.cartId!, items: guest.cart, signedIn: false, loading: false, error: "" }); return; }
    const user = await getCurrentUser();
    if (run !== generation) return;
    userId = user.userId;
    emit({ cartId: null, items: [], signedIn: true, loading: true, error: "" });
    const result = await model().get({ id: user.userId }); check(result);
    let items = result.data ? decode(result.data.items) : [];
    const before = items;
    const guest = guestState().cart;
    // Taking the larger quantity makes a repeated sign-in merge safe to retry.
    items = mergeCarts(items, guest);
    const cartId = nextCartId(result.data?.cartId, before, items);
    if (guest.length || (result.data && !validCartId(result.data.cartId))) await persist(user.userId, items, Boolean(result.data), cartId);
    if (run !== generation) return;
    exists = Boolean(result.data) || guest.length > 0;
    emit({ cartId, items, signedIn: true, loading: false, error: "" });
    if (guest.length) try {
      const current = guestState();
      current.cart = current.cart.filter(item => !guest.some(saved => cartLineKey(saved) === cartLineKey(item) && saved.quantity === item.quantity));
      localStorage.setItem(SHOPPING_KEY, JSON.stringify(current));
      window.dispatchEvent(new Event("shop-shopping"));
    } catch { /* The account copy is already saved. */ }
  } catch (cause) { if (run === generation) emit({ ...state, loading: false, error: cause instanceof Error ? cause.message : "Could not load your cart." }); }
}
export function refreshCart() { if (!pending) pending = initialize().finally(() => { pending = null; }); return pending; }
export function subscribeCart(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true; void refreshCart();
    Hub.listen("auth", ({ payload }) => { if (["signedIn", "signedOut"].includes(payload.event)) { generation++; pending = null; userId = null; exists = false; void refreshCart(); } });
    const guestChanged = () => { if (!state.signedIn && !state.loading) { const guest = guestState(); emit({ ...state, cartId: guest.cartId!, items: guest.cart }); } };
    window.addEventListener("storage", guestChanged); window.addEventListener("shop-shopping", guestChanged);
  }
  return () => { listeners.delete(listener); };
}
export const cartSnapshot = () => state;
export const cartServerSnapshot = () => initial;
export function updateCart(update: (state: Shopping) => Shopping) {
  const requestedGeneration = generation;
  const operation = writes.then(async () => {
    if (pending) await pending;
    if (requestedGeneration !== generation) throw new Error("Your session changed. Please try again.");
    if (state.loading || state.error) throw new Error(state.error || "Your cart is still loading.");
    const current = guestState();
    const items = update({ ...current, cart: state.items }).cart;
    const cartId = nextCartId(state.cartId, state.items, items);
    if (state.signedIn && userId) {
      await persist(userId, items, exists, cartId);
      if (requestedGeneration !== generation) return;
      exists = true; emit({ ...state, cartId, items });
    } else {
      localStorage.setItem(SHOPPING_KEY, JSON.stringify({ ...current, cartId, cart: items }));
      emit({ ...state, cartId, items }); window.dispatchEvent(new Event("shop-shopping"));
    }
  });
  writes = operation.catch(() => {});
  return operation;
}
