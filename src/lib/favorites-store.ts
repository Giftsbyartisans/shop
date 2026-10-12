"use client";
import "./customer-auth";
import { generateClient } from "aws-amplify/data";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import type { Schema } from "../../amplify/data/resource";
import { EMPTY_SHOPPING, parseShopping, SHOPPING_KEY } from "./shopping";
const client = generateClient<Schema>();
const auth = { authMode: "userPool" as const };
type State = { ids: string[]; signedIn: boolean; loading: boolean; error: string };
const initial: State = { ids: [], signedIn: false, loading: true, error: "" };
let state = initial;
let userId: string | null = null;
let records = new Map<string, string>();
let started = false;
let generation = 0;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();
function emit(next: State) { state = next; for (const listener of listeners) listener(); window.dispatchEvent(new Event("shop-shopping")); }
function guestState() { try { return parseShopping(localStorage.getItem(SHOPPING_KEY) || EMPTY_SHOPPING); } catch { return parseShopping(EMPTY_SHOPPING); } }
function check(result: { errors?: readonly { message: string }[] }) { if (result.errors?.length) throw new Error("Could not sync favorites. Please try again."); }
function model() { if (!client.models.CustomerFavorite) throw new Error("Account favorites need a backend update before they can be saved."); return client.models.CustomerFavorite; }
async function initialize() {
  const run = ++generation;
  emit({ ids: [], signedIn: false, loading: true, error: "" });
  try {
    const session = await fetchAuthSession();
    if (run !== generation) return;
    if (!session.tokens) { userId = null; records.clear(); emit({ ids: guestState().favorites, signedIn: false, loading: false, error: "" }); return; }
    const user = await getCurrentUser();
    if (run !== generation) return;
    userId = user.userId;
    emit({ ids: [], signedIn: true, loading: true, error: "" });
    const nextRecords = new Map<string, string>();
    let nextToken: string | null | undefined;
    do {
      const result = await model().list({ ...auth, limit: 100, nextToken }); check(result);
      for (const item of result.data) nextRecords.set(item.listingId, item.id);
      nextToken = result.nextToken;
    } while (nextToken);
    const guestIds = guestState().favorites;
    for (const listingId of guestIds) {
      if (nextRecords.has(listingId)) continue;
      const id = `${user.userId}:${listingId}`;
      const result = await model().create({ id, listingId }, auth);
      if (result.errors?.length || !result.data) {
        const existing = await model().get({ id }, auth); check(existing);
        if (!existing.data) throw new Error("Could not sync guest favorites. Please try again.");
      }
      nextRecords.set(listingId, id);
    }
    if (run !== generation) return;
    records = nextRecords;
    emit({ ids: [...records.keys()], signedIn: true, loading: false, error: "" });
    // Remove only guest entries that were successfully merged into the account.
    try { const guest = guestState(); guest.favorites = guest.favorites.filter(id => !guestIds.includes(id)); localStorage.setItem(SHOPPING_KEY, JSON.stringify(guest)); } catch { /* Account records have already been saved. */ }
  } catch (cause) { if (run === generation) emit({ ...state, loading: false, error: cause instanceof Error ? cause.message : "Could not load favorites. Please try again." }); }
}
export function refreshFavorites() { if (!pending) pending = initialize().finally(() => { pending = null; }); return pending; }
export function subscribeFavorites(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    void refreshFavorites();
    Hub.listen("auth", ({ payload }) => { if (["signedIn", "signedOut"].includes(payload.event)) { generation++; pending = null; userId = null; records.clear(); void refreshFavorites(); } });
    window.addEventListener("storage", () => { if (!state.signedIn && !state.loading) emit({ ...state, ids: guestState().favorites }); });
  }
  return () => { listeners.delete(listener); };
}
export const favoritesSnapshot = () => state;
export const favoritesServerSnapshot = () => initial;
export async function setFavorite(listingId: string, saved: boolean) {
  if (pending) await pending;
  if (state.loading || state.error) throw new Error(state.error || "Favorites are still loading. Please try again.");
  const run = generation;
  if (!state.signedIn) {
    const guest = guestState(); guest.favorites = saved ? [...new Set([...guest.favorites, listingId])] : guest.favorites.filter(id => id !== listingId);
    localStorage.setItem(SHOPPING_KEY, JSON.stringify(guest));
    emit({ ...state, ids: guest.favorites }); return;
  }
  const id = records.get(listingId) || `${userId}:${listingId}`;
  if (saved && !records.has(listingId)) {
    const result = await model().create({ id, listingId }, auth); check(result);
    if (!result.data) throw new Error("Could not save favorite.");
  } else if (!saved && records.has(listingId)) { check(await model().delete({ id }, auth)); }
  if (run !== generation) return;
  if (saved) records.set(listingId, id); else records.delete(listingId);
  emit({ ...state, ids: [...records.keys()] });
}
