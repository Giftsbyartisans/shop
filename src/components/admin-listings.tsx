"use client";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatPrice, type Listing } from "@/lib/catalog";
import { demoListings } from "@/lib/catalog";
import { importListings } from "@/lib/listing-import";
import ShopImage, { uploadImage } from "./shop-image";
import { fetchAuthSession } from "aws-amplify/auth";
import { getProperties } from "aws-amplify/storage";
import { copyEtsyImages, etsyUploadId } from "@/lib/etsy-image-import";
import { mediaUploadPrefix } from "@/lib/media-paths";
import ManagerIcon from "./manager-icon";

type Props = {
  transferOnly?: boolean;
  items: Listing[];
  bestSellerIds: string[];
  onBestSeller: (id: string) => Promise<void>;
  onSave: (
    items: Listing[],
    onProgress?: (completed: number, total: number) => void,
  ) => Promise<boolean>;
  onAdd: () => void;
  onError: (message: string) => void;
  children: React.ReactNode;
};
export default function AdminListings({
  items,
  bestSellerIds,
  onBestSeller,
  onSave,
  onAdd,
  onError,
  children,
  transferOnly = false,
}: Props) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("newest"),
    [status, setStatus] = useState("all"),
    [bestOnly, setBestOnly] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    filename: string;
    completed: number;
    total: number;
    phase: "reading" | "saving" | "success" | "error";
    message: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const [confirmSelectedDelete, setConfirmSelectedDelete] = useState(false);
  useEffect(() => {
    if (importProgress?.phase !== "success") return;
    const timer = window.setTimeout(() => setImportProgress(null), 2000);
    return () => window.clearTimeout(timer);
  }, [importProgress]);
  const file = useRef<HTMLInputElement>(null);
  const categories = Array.from(new Set(items.map((i) => i.category))).sort();
  const filtered = useMemo(
    () =>
      items
        .filter(
          (i) =>
            (!category || i.category === category) &&
            (!bestOnly || bestSellerIds.includes(i.id)) &&
            (status === "all" || i.published === (status === "published")) &&
            `${i.title} ${i.description}`
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
        )
        .sort((a, b) =>
          sort === "low"
            ? a.price - b.price
            : sort === "high"
              ? b.price - a.price
              : sort === "title"
                ? a.title.localeCompare(b.title)
                : (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
        ),
    [items, category, bestOnly, bestSellerIds, status, query, sort],
  );
  function exportJSON() {
    const blob = new Blob(
      [JSON.stringify(selectedItems.length ? selectedItems : items, null, 2)],
      {
        type: "application/json",
      },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "shop-listings.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="manager-listings-view">
      {importProgress &&
        createPortal(
          <section
            className={`manager-import-popup ${importProgress.phase}`}
            role="status"
            aria-live="polite"
            aria-label="Import progress"
          >
            <div className="manager-import-heading">
              <strong>
                {importProgress.phase === "success"
                  ? "Import complete"
                  : importProgress.phase === "error"
                    ? "Import failed"
                    : "Importing listings"}
              </strong>
              {(importProgress.phase === "success" ||
                importProgress.phase === "error") && (
                <button
                  type="button"
                  aria-label="Dismiss import notification"
                  onClick={() => setImportProgress(null)}
                >
                  ×
                </button>
              )}
            </div>
            <p className="manager-import-filename">{importProgress.filename}</p>
            <progress
              aria-label="Import progress"
              max={100}
              value={
                importProgress.phase === "reading"
                  ? undefined
                  : importProgress.phase === "success"
                    ? 100
                    : importProgress.total
                      ? Math.min(
                          99,
                          Math.round(
                            (importProgress.completed / importProgress.total) *
                              100,
                          ),
                        )
                      : 0
              }
            />
            <p>{importProgress.message}</p>
          </section>,
          document.body,
        )}
      {!transferOnly && <div className="manager-listing-toolbar">
        <h1>Listings</h1>
        <label className="manager-listing-search">
          <input
            type="search"
            placeholder="Search title or description"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ManagerIcon name="Search" />
        </label>
        <button className="primary" onClick={onAdd}>
          <span aria-hidden="true">＋</span>Add a listing
        </button>
      </div>}
      {transferOnly && <><h2>Listing import &amp; export</h2><p className="manager-help">Import Etsy CSV or JSON, or download your catalog as JSON.</p></>}
      <div className="manager-listing-tools">
        {transferOnly && <><button onClick={exportJSON} disabled={!items.length}>
          <ManagerIcon name="download" />
          {selectedItems.length ? "Export selected JSON" : "Export JSON"}
        </button>
        <button disabled={importProgress?.phase === "reading" || importProgress?.phase === "saving"} onClick={() => file.current?.click()}>
          <ManagerIcon name="upload" />
          Import Etsy CSV / JSON
        </button></>}
        <input
          ref={file}
          type="file"
          hidden
          accept=".csv,.json,text/csv,application/json"
          onChange={async (e) => {
            const input = e.currentTarget;
            const selected = input.files?.[0];
            if (!selected) return;
            setImportProgress({
              filename: selected.name,
              completed: 0,
              total: 0,
              phase: "reading",
              message: "Reading and validating your file…",
            });
            try {
              if (selected.size > 8 * 1024 * 1024)
                throw new Error("Import files must be under 8 MB.");
              const parsed = importListings(
                await selected.text(),
                selected.name,
              );
              const session = await fetchAuthSession();
              const token = session.tokens?.accessToken.toString();
              if (!token) throw new Error("Sign in before importing photos.");
              const imported = await copyEtsyImages(parsed, async (source, listing) => {
                const uploadId = await etsyUploadId(listing.id, source);
                // Stable listing ID keeps reuse working even when its title changes.
                const context = { kind: "listing-images" as const, name: "etsy", entityId: listing.id };
                const filename = "etsy-photo";
                const path = `${mediaUploadPrefix(context, filename, uploadId)}/1600.webp`;
                try {
                  await getProperties({ path });
                  return `s3:${path}`;
                } catch (error) {
                  const missing = error instanceof Error && ["NotFound", "NoSuchKey"].includes(error.name);
                  const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
                  if (!missing && status !== 404) throw error;
                }
                const response = await fetch("/api/import-image", {
                  method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ url: source }), signal: AbortSignal.timeout(25000),
                });
                if (!response.ok) {
                  const result = await response.json();
                  throw new Error(result.error || "Photo download failed.");
                }
                const blob = await response.blob();
                return uploadImage(new File([blob], filename, { type: blob.type }), context, uploadId);
              }, (completed, total) => setImportProgress(current => current && {
                ...current, phase: "saving", completed, total,
                message: `Copying and optimizing Etsy photos: ${completed} of ${total}`,
              }));
              const incoming = imported.listings;
              const merged = new Map(items.map((i) => [i.id, i]));
              incoming.forEach((i) => merged.set(i.id, i));
              setImportProgress(
                (current) =>
                  current && {
                    ...current,
                    total: incoming.length,
                    phase: "saving",
                    message: "Saving listings…",
                  },
              );
              const saved = await onSave(
                [...merged.values()],
                (completed, total) =>
                  setImportProgress(
                    (current) =>
                      current && {
                        ...current,
                        completed,
                        total,
                        message:
                          completed === total
                            ? "Refreshing your catalog…"
                            : `Saved ${completed} of ${total} listings`,
                      },
                  ),
              );
              setImportProgress(
                (current) =>
                  current && {
                    ...current,
                    phase: saved && !imported.warnings.length ? "success" : "error",
                    message: saved
                      ? imported.warnings.length
                        ? `Listings saved. Failed photos kept their listings as drafts: ${imported.warnings.join("; ")}`
                        : `${incoming.length} listings imported successfully.`
                      : "Import did not finish. Some listings may have been saved. Check the catalog before retrying.",
                  },
              );
            } catch (error) {
              setImportProgress(
                (current) =>
                  current && {
                    ...current,
                    phase: "error",
                    message:
                      error instanceof Error ? error.message : "Import failed.",
                  },
              );
              onError(
                error instanceof Error ? error.message : "Import failed.",
              );
            } finally {
              input.value = "";
            }
          }}
        />
      </div>
      {!transferOnly && <>
      {children}
      <div className="manager-selection-bar">
        <div className="manager-bulk-select">
        <label className="check">
          <input
            type="checkbox"
            disabled={!filtered.length}
            aria-label="Select all filtered listings"
            checked={
              filtered.length > 0 &&
              filtered.every((item) => selectedIds.has(item.id))
            }
            ref={(input) => {
              if (input)
                input.indeterminate =
                  filtered.some((item) => selectedIds.has(item.id)) &&
                  !filtered.every((item) => selectedIds.has(item.id));
            }}
            onChange={(e) => {
              const checked = e.target.checked;
              setSelectedIds((current) => {
                const next = new Set(current);
                filtered.forEach((item) => {
                  if (checked) next.add(item.id);
                  else next.delete(item.id);
                });
                return next;
              });
            }}
          />
          <span className="sr-only">Select all filtered listings</span>
        </label>
        <details className="manager-selection-menu">
          <summary aria-label="Selection options"><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="m2 4 4 4 4-4Z" /></svg></summary>
          <div>
            <button type="button" onClick={event => { setSelectedIds(new Set(filtered.map(item => item.id))); event.currentTarget.closest("details")?.removeAttribute("open"); }}>Select all shown</button>
            <button type="button" onClick={event => { setSelectedIds(new Set(filtered.filter(item => item.published).map(item => item.id))); event.currentTarget.closest("details")?.removeAttribute("open"); }}>Select published</button>
            <button type="button" onClick={event => { setSelectedIds(new Set(filtered.filter(item => !item.published).map(item => item.id))); event.currentTarget.closest("details")?.removeAttribute("open"); }}>Select inactive</button>
          </div>
        </details>
        </div>

        <button className="manager-bulk-action" type="button" disabled={!selectedItems.some(item => item.published)}
          onClick={async () => {
            if (await onSave(items.map(item => selectedIds.has(item.id) ? { ...item, published: false } : item))) setSelectedIds(new Set());
          }}>Deactivate</button>
        <button className="manager-bulk-action" type="button" disabled={!selectedItems.length} onClick={() => setConfirmSelectedDelete(true)}>Delete</button>
        <span role="status">{selectedItems.length} selected</span>

      </div>
      {confirmSelectedDelete && <div className="manager-delete-confirm" role="alert">
        <p>Delete {selectedItems.length} selected listings and their unused S3 files? This cannot be undone.</p>
        <button type="button" disabled={!selectedItems.length} onClick={async () => {
          if (await onSave(items.filter(item => !selectedIds.has(item.id)))) {
            setConfirmSelectedDelete(false); setSelectedIds(new Set());
          }
        }}>Confirm deletion</button>
        <button type="button" onClick={() => setConfirmSelectedDelete(false)}>Cancel</button>
      </div>}
      <div className="manager-listing-layout">
        <div>
          <div className="manager-listing-grid">
            {filtered.map((item) => (
              <article
                className={`manager-product-card${selectedIds.has(item.id) ? " manager-product-selected" : ""}`}
                key={item.id}
              >
                <Link
                  className="manager-product-open"
                  href={`/admin?listing=${encodeURIComponent(item.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => {
                    if (
                      !event.ctrlKey &&
                      !event.metaKey &&
                      !event.shiftKey &&
                      !event.altKey
                    ) {
                      event.preventDefault();
                      window.open(
                        `/admin?listing=${encodeURIComponent(item.id)}`,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }
                  }}
                  aria-label={`Edit ${item.title}`}
                >
                  <div className="manager-product-image">
                    <ShopImage src={item.image} alt={item.title} sizes="80px" />
                  </div>
                  <div className="manager-product-info">
                    <h2 title={item.title}>{item.title}</h2>
                    <p>{item.category}</p>
                    <strong>{formatPrice(item.price)}</strong>
                    <small>{item.published ? "Published" : "Draft"}</small>
                  </div>
                </Link>
                <div className="manager-product-actions">
                  <label className="manager-card-selection">
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.title}`}
                      checked={selectedIds.has(item.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedIds((current) => {
                          const next = new Set(current);
                          if (checked) next.add(item.id);
                          else next.delete(item.id);
                          return next;
                        });
                      }}
                    />
                  </label>
                  <button
                    className="manager-best-seller"
                    aria-label={`Best seller: ${item.title}`}
                    aria-pressed={bestSellerIds.includes(item.id)}
                    onClick={() => onBestSeller(item.id)}
                  >
                    <ManagerIcon name="star" />
                  </button>
                  <Link
                    href={`/admin?listing=${encodeURIComponent(item.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => {
                      if (
                        !event.ctrlKey &&
                        !event.metaKey &&
                        !event.shiftKey &&
                        !event.altKey
                      ) {
                        event.preventDefault();
                        window.open(
                          `/admin?listing=${encodeURIComponent(item.id)}`,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }
                    }}
                    className="manager-edit-link"
                  >
                    <ManagerIcon name="Settings" />
                    Edit listing
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {!filtered.length && (
            <div className="empty">
              <h2>
                {items.length
                  ? "No matching listings"
                  : "Add your first listing"}
              </h2>
              <p>
                {items.length
                  ? "Try changing your search or filters."
                  : "Create a product listing or import your catalog."}
              </p>
              {!items.length && (
                <button onClick={() => onSave([...demoListings])}>
                  Import sample listings
                </button>
              )}
            </div>
          )}
        </div>
        <aside className="manager-listing-filters" aria-label="Listing filters">
          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
              <option value="title">Title: A–Z</option>
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={bestOnly}
              onChange={(e) => setBestOnly(e.target.checked)}
            />
            Best sellers only
          </label>
          <fieldset>
            <legend>Listing status</legend>
            {[
              ["all", "All listings", items.length],
              [
                "published",
                "Published",
                items.filter((i) => i.published).length,
              ],
              ["draft", "Drafts", items.filter((i) => !i.published).length],
            ].map(([value, label, count]) => (
              <label className="check" key={value}>
                <input
                  type="radio"
                  name="listing-status"
                  checked={status === value}
                  onChange={() => setStatus(String(value))}
                />
                {label}
                <span>{count}</span>
              </label>
            ))}
          </fieldset>
        </aside>
      </div>
      </>}
    </div>
  );
}
