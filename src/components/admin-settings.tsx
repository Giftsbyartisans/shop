"use client";
import type { ShopContent } from "@/lib/content";
import ShopImage, { uploadImage } from "./shop-image";
import { useState } from "react";

export function ImageField({
  label,
  value,
  onChange,
  onBusy,
  onError,
}: {
  label: string;
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
              onChange(await uploadImage(file));
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
}: {
  tab: string;
  content: ShopContent;
  change: <K extends keyof ShopContent>(key: K, value: ShopContent[K]) => void;
  onBusy: (busy: boolean) => void;
  onError: (message: string) => void;
}) {
  const image = (
    label: string,
    value: string,
    onChange: (value: string) => void,
  ) => <ImageField {...{ label, value, onChange, onBusy, onError }} />;
  const field = (key: keyof ShopContent, label: string, multiline = false) => (
    <label>
      {label}
      {multiline ? (
        <textarea
          rows={4}
          value={String(content[key])}
          onChange={(e) => change(key, e.target.value as never)}
        />
      ) : (
        <input
          type={key === "contactEmail" ? "email" : "text"}
          value={String(content[key])}
          onChange={(e) => change(key, e.target.value as never)}
        />
      )}
    </label>
  );
  if (tab === "Brand & announcement")
    return (
      <>
        {field("announcement", "Announcement text")}
        <p className="manager-help">
          One announcement bar is shown. Leave the text empty to hide it.
          Include sale messages here when needed.
        </p>
        {image("Brand logo", content.logo, (value) => change("logo", value))}
        {field("logoAlt", "Logo description")}
        <button onClick={() => change("logo", "")}>
          Use text brand instead
        </button>
        <h2>Favicon</h2>
        <p className="manager-help">
          Choose the browser-tab icon. A square PNG (32 × 32 or 48 × 48 pixels)
          works best. Upload an image or enter an HTTPS image URL.
        </p>
        {image("Favicon", content.favicon, (value) => change("favicon", value))}
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
          gifts by category.
        </p>
        {content.categories.map((category) => (
          <article className="manager-entry" key={category.id}>
            <div className="manager-entry-heading">
              <h3>{category.name || "New category"}</h3>
              <button
                onClick={() =>
                  change(
                    "categories",
                    content.categories.filter((c) => c.id !== category.id),
                  )
                }
              >
                Remove
              </button>
            </div>
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
            )}
          </article>
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
          The discount applies to each published gift’s regular price. Disable
          the sale to restore regular prices. Edit sale announcements in Brand &
          announcement.
        </p>
      </>
    );
  if (tab === "Testimonials")
    return (
      <>
        <p className="manager-help">
          Add customer reviews you have permission to publish.
        </p>
        {content.reviews.map((review) => (
          <article className="manager-entry" key={review.id}>
            <div className="manager-entry-heading">
              <h3>{review.name || "New testimonial"}</h3>
              <button
                onClick={() =>
                  change(
                    "reviews",
                    content.reviews.filter((r) => r.id !== review.id),
                  )
                }
              >
                Remove
              </button>
            </div>
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
          </article>
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
      <h2>Contact & wholesale</h2>
      {field("contactText", "Contact page introduction", true)}
      {field("wholesaleText", "Wholesale page introduction", true)}
      <h2>Shop policies</h2>
      {content.policies.map((policy) => (
        <article className="manager-entry" key={policy.id}>
          <div className="manager-entry-heading">
            <h3>{policy.title || "New policy"}</h3>
            <button
              onClick={() =>
                change(
                  "policies",
                  content.policies.filter((p) => p.id !== policy.id),
                )
              }
            >
              Remove
            </button>
          </div>
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
        </article>
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
