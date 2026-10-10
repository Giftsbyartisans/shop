"use client";
import Link from "next/link";
import DeletionProgress from "@/components/deletion-progress";
import { useEffect, useRef, useState } from "react";
import { type Listing } from "@/lib/catalog";
import { defaultContent, type ShopContent } from "@/lib/content";
import {
  isAdmin,
  listListings,
  listInquiries,
  saveListing,
  deleteListing,
  type Inquiry,
  loadShopContent,
  saveShopContent,
  deleteInquiry,
} from "@/lib/backend";
import AdminSettings from "@/components/admin-settings";
import ManagerIcon from "@/components/manager-icon";
import ListingEditor from "@/components/listing-editor";
import AdminListings from "@/components/admin-listings";
import { signIn, signOut, confirmSignIn } from "aws-amplify/auth";
export default function Admin() {
  const [items, setItems] = useState<Listing[]>([]),
    [tab, setTab] = useState("Listings"),
    [editing, setEditing] = useState<Listing | null>(null),
    [status, setStatus] = useState(""),
    [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [authorized, setAuthorized] = useState(false),
    [checking, setChecking] = useState(true),
    [busy, setBusy] = useState(false),
    [challenge, setChallenge] = useState(false);
  const [content, setContent] = useState<ShopContent>(defaultContent),
    [contentReady, setContentReady] = useState(false),
    [dirty, setDirty] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [uploading, setUploading] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [editorOnly, setEditorOnly] = useState(false);
  const openedListing = useRef(false);
  async function refresh() {
    const [list, inbox] = await Promise.all([
      listListings(true),
      listInquiries(),
    ]);
    setItems(list);
    setInquiries(inbox);
    if (!openedListing.current) {
      openedListing.current = true;
      const id = new URLSearchParams(window.location.search).get("listing");
      if (id) {
        setEditorOnly(true);
        const item = list.find((item) => item.id === id);
        if (item) setEditing({ ...item });
        else setStatus("This listing could not be found.");
      }
    }
  }
  useEffect(() => {
    let active = true;
    isAdmin()
      .then(async (allowed) => {
        if (active) setAuthorized(allowed);
        if (allowed) await load();
      })
      .catch((e) => setStatus(e.message))
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!authorized) return;
    const channel = new BroadcastChannel("shop-listings");
    channel.onmessage = () => {
      void refresh().catch((e) =>
        setStatus(
          e instanceof Error ? e.message : "Could not refresh listings.",
        ),
      );
    };
    return () => channel.close();
  }, [authorized]);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    const values = new FormData(e.currentTarget);
    try {
      const result = challenge
        ? await confirmSignIn({
            challengeResponse: String(values.get("password")),
          })
        : await signIn({
            username: String(values.get("email")),
            password: String(values.get("password")),
          });
      if (result.isSignedIn) {
        const allowed = await isAdmin();
        setAuthorized(allowed);
        if (allowed) await load();
        else {
          await signOut();
          setStatus("This account is not in the Admins group.");
        }
      } else if (
        result.nextStep.signInStep ===
        "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
      ) {
        setChallenge(true);
        setStatus("Choose a new password to finish signing in.");
      } else {
        setStatus(
          "Additional sign-in verification is required: " +
            result.nextStep.signInStep,
        );
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }
  async function save(
    next: Listing[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<boolean> {
    setBusy(true);
    try {
      const removed = items.filter((i) => !next.some((n) => n.id === i.id));
      if (removed.length)
        setDeletionProgress({ completed: 0, total: removed.length });
      const changed = next.filter(
        (n) => items.find((i) => i.id === n.id) !== n,
      );
      const total = removed.length + changed.length;
      let completed = 0;
      onProgress?.(0, total);
      for (const item of removed) {
        await deleteListing(item.id);
        setDeletionProgress(
          (current) =>
            current && { ...current, completed: current.completed + 1 },
        );
        onProgress?.(++completed, total);
      }
      for (const item of changed) {
        await saveListing(item);
        onProgress?.(++completed, total);
      }
      await refresh();
      const channel = new BroadcastChannel("shop-listings");
      channel.postMessage("updated");
      channel.close();
      if (editorOnly) {
        setStatus("Changes saved. You can close this tab.");
        window.close();
      } else {
        setEditing(null);
        setStatus("Saved to the backend.");
      }
      return true;
    } catch (e) {
      setStatus(
        (e instanceof Error ? e.message : "Save failed") +
          ". Refresh and retry if a publication did not finish.",
      );
      return false;
    } finally {
      setDeletionProgress(null);
      setBusy(false);
    }
  }

  async function load() {
    await Promise.all([refresh(), loadSettings()]);
  }
  async function loadSettings() {
    setContentReady(false);
    try {
      setContent(await loadShopContent());
      setContentReady(true);
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : "Could not load website settings.",
      );
    }
  }
  function change<K extends keyof ShopContent>(key: K, value: ShopContent[K]) {
    setContent((c) => ({ ...c, [key]: value }));
    setDirty(true);
  }
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const bestSellerSaving = useRef(false);
  useEffect(() => {
    const confirmations = [
      "Added to best sellers.",
      "Removed from best sellers.",
      "Saved to the backend.",
      "Changes saved. You can close this tab.",
      "Website changes saved. Your shop is up to date.",
      "Messages refreshed.",
      "Message deleted.",
    ];
    if (!confirmations.includes(status)) return;
    const timer = window.setTimeout(() => setStatus(""), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);
  async function toggleBestSeller(id: string) {
    if (bestSellerSaving.current) return;
    bestSellerSaving.current = true;
    const previous = content.bestSellerIds;
    const adding = !previous.includes(id);
    setContent((current) => ({
      ...current,
      bestSellerIds: adding
        ? [...previous, id]
        : previous.filter((value) => value !== id),
    }));
    setBusy(true);
    setStatus("");
    try {
      const saved = await loadShopContent();
      const ids = adding
        ? Array.from(new Set([...saved.bestSellerIds, id]))
        : saved.bestSellerIds.filter((value) => value !== id);
      await saveShopContent({ ...saved, bestSellerIds: ids });
      setContent((current) => ({ ...current, bestSellerIds: ids }));
      setStatus(
        adding ? "Added to best sellers." : "Removed from best sellers.",
      );
    } catch (error) {
      setContent((current) => ({ ...current, bestSellerIds: previous }));
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not update best sellers.",
      );
    } finally {
      bestSellerSaving.current = false;
      setBusy(false);
    }
  }
  async function saveWebsite() {
    setBusy(true);
    setStatus("");
    try {
      await saveShopContent(content);
      setDirty(false);
      setStatus("Website changes saved. Your shop is up to date.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await signOut();
      setAuthorized(false);
      setItems([]);
      setInquiries([]);
      setChallenge(false);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Sign out failed.");
    }
  }
  if (checking)
    return (
      <main className="manager-login">
        <p role="status">Checking admin access…</p>
      </main>
    );
  if (!authorized)
    return (
      <main className="manager-login">
        <p className="manager-wordmark">Shop Manager</p>
        <h1>Welcome back</h1>
        <p className="manager-help">Sign in to manage your shop.</p>
        <form onSubmit={login}>
          {!challenge && (
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </label>
          )}
          <label>
            {challenge ? "New password" : "Password"}
            <input
              name="password"
              type="password"
              autoComplete={challenge ? "new-password" : "current-password"}
              required
            />
          </label>
          <p role="status">{status}</p>
          <button className="primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <Link href="/">← Back to shop</Link>
      </main>
    );
  const listingEditor = editing ? (
    <ListingEditor
      key={editing.id}
      item={editing}
      content={content}
      busy={busy || !contentReady}
      onError={setStatus}
      onBusy={setUploading}
      onCancel={() => {
        if (editorOnly) window.close();
        else setEditing(null);
      }}
      onSave={async (listing, bestSeller) => {
        setBusy(true);
        setStatus("");
        try {
          const selected = content.bestSellerIds.includes(listing.id);
          if (selected !== bestSeller) {
            const updated = {
              ...content,
              bestSellerIds: bestSeller
                ? [...content.bestSellerIds, listing.id]
                : content.bestSellerIds.filter((id) => id !== listing.id),
            };
            await saveShopContent(updated);
            setContent(updated);
          }
          await save(
            items.some((item) => item.id === listing.id)
              ? items.map((item) => (item.id === listing.id ? listing : item))
              : [...items, listing],
          );
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Save failed.");
        } finally {
          setBusy(false);
        }
      }}
    />
  ) : null;
  if (editorOnly)
    return (
      <main className="manager-editor-page">
        <header className="listing-editor-header">
          <Link href="/" className="listing-editor-brand">
            GiftsByArtisans
          </Link>
          <Link href="/admin">Back to listings</Link>
        </header>
        <div className="manager-fields">
          {status && (
            <p className="manager-feedback" role="status">
              {status}
            </p>
          )}
          <fieldset disabled={busy || uploading} className="manager-fields">
            {listingEditor || <p>The listing could not be loaded.</p>}
          </fieldset>
        </div>
        {deletionProgress && <DeletionProgress {...deletionProgress} />}
      </main>
    );
  const settingsTabs = [
    "Brand & announcement",
    "Banner Image",
    "Categories",
    "Sale",
    "Testimonials",
    "Social & footer",
    "Pages & policies",
  ];
  const tabs = ["Listings", "Messages", ...settingsTabs];
  const isSettings = settingsTabs.includes(tab);
  return (
    <main
      className={`manager-shell${collapsed ? " manager-collapsed" : ""}`}
      aria-busy={deletionProgress !== null}
    >
      {deletionProgress && <DeletionProgress {...deletionProgress} />}
      <aside className="manager-sidebar">
        <div className="manager-sidebar-title">
          <h2>Shop Manager</h2>
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            <ManagerIcon name="menu" />
          </button>
        </div>
        <nav className="manager-nav" aria-label="Shop management">
          {tabs.map((name) => (
            <button
              disabled={busy || uploading}
              key={name}
              title={name}
              aria-current={tab === name ? "page" : undefined}
              onClick={() => {
                setTab(name);
                setEditing(null);
                setStatus("");
              }}
            >
              <ManagerIcon name={name} />
              <span>{name}</span>
            </button>
          ))}
        </nav>
        <div className="manager-account-actions">
          <Link
            className="manager-view-shop"
            href="/"
            target="_blank"
            aria-label="View shop"
          >
            <ManagerIcon name="shop" />
            <span>View shop</span>
          </Link>
          <button
            type="button"
            aria-label="Sign out"
            disabled={busy || uploading || dirty}
            title={
              dirty ? "Save website changes before signing out" : undefined
            }
            onClick={logout}
          >
            <ManagerIcon name="logout" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
      <section className="manager-main">
        {tab !== "Listings" && <h1>{tab}</h1>}
        {status && (
          <p className="manager-feedback" role="status">
            {status}
          </p>
        )}
        <fieldset className="manager-fields" disabled={busy || uploading}>
          {tab === "Listings" ? (
            <AdminListings
              items={items}
              bestSellerIds={content.bestSellerIds}
              onBestSeller={toggleBestSeller}
              onSave={save}
              onError={setStatus}
              onAdd={() =>
                setEditing({
                  id: crypto.randomUUID(),
                  title: "",
                  description: "",
                  category: content.categories[0]?.name || "Uncategorized",
                  image: "/demo/gift-0.svg",
                  price: 0,
                  published: false,
                })
              }
            >
              {listingEditor}
            </AdminListings>
          ) : tab === "Messages" ? (
            <>
              <div className="manager-entry-heading">
                <p className="manager-help">
                  Contact and wholesale inquiries. Reply using the customer’s
                  email address.
                </p>
                <button
                  onClick={async () => {
                    setBusy(true);
                    try {
                      setInquiries(await listInquiries());
                      setStatus("Messages refreshed.");
                    } catch (e) {
                      setStatus(
                        e instanceof Error ? e.message : "Refresh failed.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Refresh
                </button>
              </div>
              {inquiries.length ? (
                inquiries.map((i) => (
                  <article className="manager-entry" key={i.id}>
                    <div className="manager-entry-heading">
                      <h3>{i.name}</h3>
                      <span className="badge">{i.kind}</span>
                    </div>
                    <a href={"mailto:" + i.email}>{i.email}</a>
                    {i.business && (
                      <p>
                        {i.business} · {i.quantity || "Quantity not specified"}
                      </p>
                    )}
                    <p className="pre-wrap">{i.message}</p>
                    <small>{new Date(i.createdAt).toLocaleString()}</small>
                    <div>
                      <button
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await deleteInquiry(i.id);
                            setInquiries((current) =>
                              current.filter((x) => x.id !== i.id),
                            );
                            setStatus("Message deleted.");
                          } catch (e) {
                            setStatus(
                              e instanceof Error ? e.message : "Delete failed.",
                            );
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Delete message
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="manager-help">No inquiries yet.</p>
              )}
            </>
          ) : contentReady ? (
            <AdminSettings
              {...{ tab, content, change }}
              onBusy={setUploading}
              onError={setStatus}
            />
          ) : (
            <div className="manager-entry">
              <p>Website settings could not be loaded.</p>
              <button onClick={loadSettings}>Try again</button>
            </div>
          )}
        </fieldset>
      </section>
      {(isSettings || dirty) && (
        <div className="manager-save-bar">
          <span>
            {uploading ? "Uploading image…" : dirty ? "Unsaved changes" : ""}
          </span>
          <button
            className="primary"
            disabled={busy || uploading || !contentReady}
            onClick={saveWebsite}
          >
            {busy ? "Saving…" : "Save website changes"}
          </button>
        </div>
      )}
    </main>
  );
}
