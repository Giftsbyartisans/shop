"use client";
import type { ShopContent } from "@/lib/content";
import ShopImage, { uploadImage } from "./shop-image";
import type { MediaUploadContext } from "@/lib/media-paths";
import { useRef, useState } from "react";

export function ImageField({
  label,
  uploadContext,
  value,
  onChange,
  onBusy,
  onError,
}: {
  label: string;
  uploadContext?: MediaUploadContext;
  value: string;
  onChange: (value: string) => void;
  onBusy: (busy: boolean) => void;
  onError: (message: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  return (
    <div className="manager-image-field">
      <label>
        {label} URL
        <input
          value={value}
          placeholder="https://… or upload below"
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      <label>
        Upload PNG, JPEG or WebP (up to 8 MB)
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={uploading}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            onBusy(true);
            try {
              onChange(await uploadImage(file, uploadContext));
            } catch (error) {
              onError(
                error instanceof Error ? error.message : "Upload failed.",
              );
            } finally {
              setUploading(false);
              onBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      {uploading && <p role="status">Uploading image…</p>}
      {value && (
        <ShopImage
          src={value}
          alt={`${label} preview`}
          className="manager-image-preview"
          sizes="320px"
        />
      )}
    </div>
  );
}
export default function AdminSettings({
  tab,
  content,
  change,
  onBusy,
  onError,
  categoryEditing = false,
}: {
  tab: string;
  categoryEditing?: boolean;
  content: ShopContent;
  change: <K extends keyof ShopContent>(key: K, value: ShopContent[K]) => void;
  onBusy: (busy: boolean) => void;
  onError: (message: string) => void;
}) {
  const drag = useRef<{
    id: string; target: string; startY: number; scrollY: number; center: number; extent: number;
    tiles: { id: string; element: HTMLElement; center: number }[];
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const resetDrag = () => {
    for (const tile of drag.current?.tiles ?? []) {
      tile.element.style.transform = "";
      tile.element.classList.remove("category-dragging");
    }
    drag.current = null;
    setDropTarget(null);
  };
  const moveCategory = (id: string, target: string) => {
    const from = content.categories.findIndex(category => category.id === id);
    const to = content.categories.findIndex(category => category.id === target);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...content.categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    change("categories", next);
  };
  const image = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    uploadContext: MediaUploadContext,
  ) => <ImageField {...{ label, value, onChange, onBusy, onError, uploadContext }} />;
  const field = (key: keyof ShopContent, label: string, multiline = false) => (
    <label>
      {label}
      {multiline ? (
        <textarea
          rows={4}
          value={String(content[key] ?? "")}
          onChange={(e) => change(key, e.target.value as never)}
        />
      ) : (
        <input
          type={key === "contactEmail" ? "email" : "text"}
          value={String(content[key] ?? "")}
          onChange={(e) => change(key, e.target.value as never)}
        />
      )}
    </label>
  );
  if (tab === "Personalization") return <>
    <h2>Personalization library</h2>
    <p>Create reusable headings, instructions, and optional prices. Listings use the default unless you choose an override.</p>
    <label>Default personalization<select value={content.defaultPersonalizationId} onChange={event => change("defaultPersonalizationId", event.target.value)}><option value="">None</option>{(content.personalizations ?? []).map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
    {(content.personalizations ?? []).map(template => {
      const update = (values: Partial<typeof template>) => change("personalizations", (content.personalizations ?? []).map(item => item.id === template.id ? { ...item, ...values } : item));
      return <details key={template.id} className="manager-entry manager-policy-entry personalization-entry">
        <summary className="manager-category-summary"><span>{template.name || "New personalization"}</span></summary>
        <label>Name<input value={template.name} required maxLength={100} onChange={event => update({ name: event.target.value })} /></label>
        <label>Heading<input value={template.heading} maxLength={150} onChange={event => update({ heading: event.target.value })} /></label>
        <label>Instructions<textarea value={template.text} maxLength={2000} rows={3} onChange={event => update({ text: event.target.value })} /></label>
        <label>Price per item (USD)<input type="number" min="0" step="0.01" value={template.price ?? ""} placeholder="Free" onChange={event => update({ price: event.target.value === "" ? undefined : Number(event.target.value) })} /></label>
        <p className="muted">Leave the price blank for free personalization.</p>
        <div className="recordActions"><button type="button" disabled={content.defaultPersonalizationId === template.id} onClick={() => change("defaultPersonalizationId", template.id)}>Set as default</button><button type="button" onClick={() => { change("personalizations", (content.personalizations ?? []).filter(item => item.id !== template.id)); if (content.defaultPersonalizationId === template.id) change("defaultPersonalizationId", ""); }}>Remove</button></div>
      </details>;
    })}
    <button type="button" onClick={() => change("personalizations", [...(content.personalizations ?? []), { id: crypto.randomUUID(), name: "New personalization", heading: "Want to engrave something?", text: "Tell us what you would like engraved." }])}>Add personalization</button>
    <p className="muted">Save website changes to publish the library and default.</p>
  </>;
  if (tab === "Brand & announcement")
    return (
      <>
        {field("announcement", "Announcement text")}
        <p className="manager-help">
          One announcement bar is shown. Leave the text empty to hide it.
          Include sale messages here when needed.
        </p>
        {image("Brand logo", content.logo, (value) => change("logo", value), { kind: "logos", name: content.logoAlt || "brand-logo" })}
        {field("logoAlt", "Logo description")}
        <button onClick={() => change("logo", "")}>
          Use text brand instead
        </button>
        <h2>Favicon</h2>
        <p className="manager-help">
          Choose the browser-tab icon. A square PNG (32 × 32 or 48 × 48 pixels)
          works best. Upload an image or enter an HTTPS image URL.
        </p>
        {image("Favicon", content.favicon, (value) => change("favicon", value), { kind: "favicons", name: "website-icon" })}
        <button onClick={() => change("favicon", "")}>
          Reset favicon to default
        </button>
      </>
    );
  if (tab === "Banner Image")
    return (
      <>
        {field("bannerTitle", "Banner heading")}
        {field("bannerText", "Banner description", true)}
        {content.banners.map((banner, index) => (
          <article className="manager-entry" key={banner.id}>
            <div className="manager-entry-heading">
              <h3>Banner {index + 1}</h3>
              <button
                onClick={() =>
                  change(
                    "banners",
                    content.banners.filter((b) => b.id !== banner.id),
                  )
                }
              >
                Remove
              </button>
            </div>
            {image("Banner image", banner.image, (value) =>
              change(
                "banners",
                content.banners.map((b) =>
                  b.id === banner.id ? { ...b, image: value } : b,
                ),
              ),
              { kind: "banners", name: banner.alt || `banner-${index + 1}`, entityId: banner.id },
            )}
            <label>
              Image description
              <input
                value={banner.alt}
                onChange={(e) =>
                  change(
                    "banners",
                    content.banners.map((b) =>
                      b.id === banner.id ? { ...b, alt: e.target.value } : b,
                    ),
                  )
                }
              />
            </label>
            <button
              disabled={!index}
              onClick={() => {
                const next = [...content.banners];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                change("banners", next);
              }}
            >
              Move earlier
            </button>
          </article>
        ))}
        <button
          disabled={content.banners.length >= 10}
          onClick={() =>
            change("banners", [
              ...content.banners,
              { id: crypto.randomUUID(), image: "", alt: "" },
            ])
          }
        >
          Add banner image
        </button>
      </>
    );
  if (tab === "Categories")
    return (
      <>
        <p className="manager-help">
          Use the same category names in your listings. Customers can browse
          products by category. Drag the handles to rearrange categories, then save website changes. You can also focus a handle and use the arrow keys.
        </p>
        {content.categories.map((category, index) => (
          <details className={`manager-entry manager-category-entry${dropTarget === category.id ? " category-drop-target category-dragging" : ""}`} data-category-id={category.id} key={category.id}>
            <summary className="manager-category-summary">
              <button className="manager-category-drag" type="button" aria-label={`Reorder ${category.name || "category"}`}
                onClick={event => { event.preventDefault(); event.stopPropagation(); }}
                onPointerDown={event => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  event.currentTarget.focus();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  const entry = event.currentTarget.closest<HTMLElement>('[data-category-id]');
                  if (!entry?.parentElement) return;
                  const tiles = Array.from(entry.parentElement.querySelectorAll<HTMLElement>('[data-category-id]')).map(element => {
                    const rect = element.getBoundingClientRect();
                    return { id: element.dataset.categoryId!, element, center: rect.top + rect.height / 2 };
                  });
                  const rect = entry.getBoundingClientRect();
                  const tileIndex = tiles.findIndex(tile => tile.id === category.id);
                  const nextTile = tiles[tileIndex + 1]?.element.getBoundingClientRect();
                  const previousTile = tiles[tileIndex - 1]?.element.getBoundingClientRect();
                  const gap = nextTile ? nextTile.top - rect.bottom : previousTile ? rect.top - previousTile.bottom : 0;
                  drag.current = { id: category.id, target: category.id, startY: event.clientY, scrollY: window.scrollY,
                    center: rect.top + rect.height / 2,
                    extent: rect.height + Math.max(0, gap), tiles };
                  setDropTarget(category.id);
                }}
                onPointerMove={event => {
                  if (!drag.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
                  const active = drag.current;
                  const delta = event.clientY - active.startY + window.scrollY - active.scrollY;
                  const center = active.center + delta;
                  const from = active.tiles.findIndex(tile => tile.id === active.id);
                  let to = from;
                  for (let i = 0; i < active.tiles.length; i++) {
                    if (i > from && center > active.tiles[i].center) to = i;
                    if (i < from && center < active.tiles[i].center) { to = i; break; }
                  }
                  active.target = active.tiles[to].id;
                  active.tiles.forEach((tile, index) => {
                    const offset = index === from ? delta
                      : from < to && index > from && index <= to ? -active.extent
                      : from > to && index >= to && index < from ? active.extent : 0;
                    tile.element.style.transform = `translateY(${offset}px)`;
                  });
                  if (event.clientY < 80) window.scrollBy(0, -16);
                  else if (event.clientY > window.innerHeight - 80) window.scrollBy(0, 16);
                }}
                onPointerUp={event => {
                  if (!drag.current) return;
                  const { id, target } = drag.current;
                  resetDrag();
                  moveCategory(id, target);
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                }}
                onPointerCancel={resetDrag}
                onLostPointerCapture={resetDrag}
                onKeyDown={event => {
                  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                  event.preventDefault();
                  const target = content.categories[index + (event.key === "ArrowUp" ? -1 : 1)];
                  if (target) moveCategory(category.id, target.id);
                }}>
                <svg width="18" height="22" viewBox="0 0 18 22" fill="currentColor" aria-hidden="true">
                  {[5, 11, 17].flatMap(y => [6, 12].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />))}
                </svg>
              </button>
              <span>{category.name || "New category"}</span>

            </summary>
            <label>
              Category name
              <input
                value={category.name}
                onChange={(e) =>
                  change(
                    "categories",
                    content.categories.map((c) =>
                      c.id === category.id ? { ...c, name: e.target.value } : c,
                    ),
                  )
                }
              />
            </label>
            {image("Category image", category.image, (value) =>
              change(
                "categories",
                content.categories.map((c) =>
                  c.id === category.id ? { ...c, image: value } : c,
                ),
              ),
              { kind: "categories", name: category.name, entityId: category.id },
            )}
            {categoryEditing && <button type="button" className="manager-category-remove"
                onClick={() =>
                  change(
                    "categories",
                    content.categories.filter((c) => c.id !== category.id),
                  )
                }
              >
                Remove category
              </button>}
          </details>
        ))}
        <button
          disabled={content.categories.length >= 30}
          onClick={() =>
            change("categories", [
              ...content.categories,
              { id: crypto.randomUUID(), name: "New category", image: "" },
            ])
          }
        >
          Add category
        </button>
      </>
    );
  if (tab === "Sale")
    return (
      <>
        <label className="check">
          <input
            type="checkbox"
            checked={content.saleEnabled}
            onChange={(e) => change("saleEnabled", e.target.checked)}
          />
          Enable sale
        </label>
        <label>
          Store discount (%)
          <input
            type="number"
            min="0"
            max="99"
            value={content.salePercent}
            onChange={(e) => change("salePercent", Number(e.target.value))}
          />
        </label>
        <p className="manager-help">
          The storewide discount applies to products without a saved sale price.
          Saved listing sale prices apply even when this switch is off. Edit sale
          announcements in Brand & announcement.
        </p>
      </>
    );
  if (tab === "Testimonials")
    return (
      <>
        <p className="manager-help">
          Add customer reviews you have permission to publish.
        </p>
        <label>
          Autoplay interval (seconds)
          <input type="number" min="0" max="300" step="1" value={content.testimonialIntervalSeconds ?? 5}
            onChange={event => change("testimonialIntervalSeconds", Number(event.target.value))} />
        </label>
        <p className="manager-help">Default: 5 seconds. Set 0 to disable autoplay. Save website changes to apply.</p>
        {content.reviews.map((review) => (
          <details className="manager-entry manager-policy-entry" key={review.id}>
            <summary className="manager-category-summary"><span>{review.name || "New testimonial"}</span></summary>
            <div className="manager-policy-content">
            <label>
              Customer display name
              <input
                value={review.name}
                onChange={(e) =>
                  change(
                    "reviews",
                    content.reviews.map((r) =>
                      r.id === review.id ? { ...r, name: e.target.value } : r,
                    ),
                  )
                }
              />
            </label>
            <label>Review date
              <input type="date" value={review.dateReviewed ?? ""} onChange={event => change("reviews", content.reviews.map(item => item.id === review.id ? { ...item, dateReviewed: event.target.value || undefined } : item))} />
            </label>
            <label>
              Rating (1–5)
              <input
                type="number"
                min="1"
                max="5"
                step="1"
                value={review.rating}
                onChange={(e) =>
                  change(
                    "reviews",
                    content.reviews.map((r) =>
                      r.id === review.id
                        ? { ...r, rating: Number(e.target.value) }
                        : r,
                    ),
                  )
                }
              />
            </label>
            <label>
              Review
              <textarea
                rows={4}
                value={review.text}
                onChange={(e) =>
                  change(
                    "reviews",
                    content.reviews.map((r) =>
                      r.id === review.id ? { ...r, text: e.target.value } : r,
                    ),
                  )
                }
              />
            </label>
              <button type="button"
                onClick={() =>
                  change(
                    "reviews",
                    content.reviews.filter((r) => r.id !== review.id),
                  )
                }
              >
                Remove testimonial
              </button>
            </div>
          </details>
        ))}
        <button
          disabled={content.reviews.length >= 50}
          onClick={() =>
            change("reviews", [
              ...content.reviews,
              { id: crypto.randomUUID(), name: "", text: "", rating: 5 },
            ])
          }
        >
          Add testimonial
        </button>
      </>
    );
  if (tab === "Social & footer")
    return (
      <>
        {field("instagram", "Instagram profile URL")}
        {field("etsy", "Etsy shop URL")}
        {field("pinterest", "Pinterest profile URL")}
        {field("footerText", "Footer description", true)}
        {field("businessName", "Legal business name")}
        {field("contactEmail", "Customer contact email")}
        {field("phone", "Phone number")}
        {field("address", "Business address", true)}
        <p className="manager-help">
          Empty social links and contact details are hidden from customers.
        </p>
      </>
    );
  return (
    <>
      <details className="manager-entry manager-policy-entry">
        <summary className="manager-category-summary"><span>Contact &amp; wholesale</span></summary>
        <div className="manager-policy-content">
          {field("contactText", "Contact page introduction", true)}
          {field("wholesaleText", "Wholesale page introduction", true)}
        </div>
      </details>
      <h2>Shop policies</h2>
      {content.policies.map((policy) => (
        <details className="manager-entry manager-policy-entry" key={policy.id}>
          <summary className="manager-category-summary"><span>{policy.title || "New policy"}</span></summary>
          <div className="manager-policy-content">
          <label>
            Policy heading
            <input
              value={policy.title}
              onChange={(e) =>
                change(
                  "policies",
                  content.policies.map((p) =>
                    p.id === policy.id ? { ...p, title: e.target.value } : p,
                  ),
                )
              }
            />
          </label>
          <label>
            Policy text
            <textarea
              rows={7}
              value={policy.text}
              onChange={(e) =>
                change(
                  "policies",
                  content.policies.map((p) =>
                    p.id === policy.id ? { ...p, text: e.target.value } : p,
                  ),
                )
              }
            />
          </label>
            <button type="button"
              onClick={() =>
                change(
                  "policies",
                  content.policies.filter((p) => p.id !== policy.id),
                )
              }
            >
              Remove policy
            </button>
          </div>
        </details>
      ))}
      <button
        disabled={content.policies.length >= 20}
        onClick={() =>
          change("policies", [
            ...content.policies,
            { id: crypto.randomUUID(), title: "New policy", text: "" },
          ])
        }
      >
        Add policy section
      </button>
    </>
  );
}
