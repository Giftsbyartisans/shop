"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { uploadData } from "aws-amplify/storage";
import type { Listing } from "@/lib/catalog";
import type { ShopContent } from "@/lib/content";
import ShopImage, { uploadImage } from "./shop-image";
import ShopVideo from "./shop-video";
import ManagerIcon from "./manager-icon";

type Props = {
  item: Listing;
  content: ShopContent;
  busy: boolean;
  onSave: (item: Listing, bestSeller: boolean) => Promise<void>;
  onCancel: () => void;
  onError: (message: string) => void;
  onBusy: (busy: boolean) => void;
};
export default function ListingEditor({
  item,
  content,
  busy,
  onSave,
  onCancel,
  onError,
  onBusy,
}: Props) {
  const [draft, setDraft] = useState<Listing>(() => ({
    ...item,
    images: item.images?.length
      ? [...item.images]
      : item.image
        ? [item.image]
        : [],
    videos: [...(item.videos ?? [])],
  }));
  const [bestSeller, setBestSeller] = useState(
      content.bestSellerIds.includes(item.id),
    ),
    [uploading, setUploading] = useState(false),
    [uploadStatus, setUploadStatus] = useState("");
  const photos = useRef<HTMLInputElement>(null),
    videos = useRef<HTMLInputElement>(null);
  const images = draft.images ?? [];
  const categories = Array.from(
    new Set([draft.category, ...content.categories.map((c) => c.name)]),
  ).filter(Boolean);
  async function upload(files: FileList | null, video = false) {
    if (!files?.length) return;
    const current = video ? (draft.videos ?? []) : images;
    const limit = video ? 2 : 10;
    if (files.length + current.length > limit) {
      onError(`You can add up to ${limit} ${video ? "videos" : "photos"}.`);
      return;
    }
    const inputFiles = Array.from(files);
    if (
      inputFiles.some((file) =>
        video
          ? !["video/mp4", "video/webm"].includes(file.type) ||
            file.size > 50 * 1024 * 1024
          : !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
            file.size > 8 * 1024 * 1024,
      )
    ) {
      onError(
        video
          ? "Use MP4 or WebM videos up to 50 MB each."
          : "Use PNG, JPEG, or WebP photos up to 8 MB each.",
      );
      return;
    }
    setUploading(true);
    onBusy(true);
    try {
      for (let index = 0; index < inputFiles.length; index++) {
        setUploadStatus(`Uploading ${index + 1} of ${inputFiles.length}…`);
        const file = inputFiles[index];
        let path: string;
        if (video) {
          const storagePath = `media/${crypto.randomUUID()}.${file.type === "video/mp4" ? "mp4" : "webm"}`;
          await uploadData({
            path: storagePath,
            data: file,
            options: { contentType: file.type },
          }).result;
          path = `s3:${storagePath}`;
        } else path = await uploadImage(file);
        setDraft((previous) =>
          video
            ? { ...previous, videos: [...(previous.videos ?? []), path] }
            : {
                ...previous,
                images: [...(previous.images ?? []), path],
                image: previous.images?.length ? previous.image : path,
              },
        );
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      onBusy(false);
      setUploadStatus("");
    }
  }
  return (
    <form
      className="listing-edit-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const action = (
          event.nativeEvent as SubmitEvent
        ).submitter?.getAttribute("value");
        await onSave(
          {
            ...draft,
            image: images[0] ?? "",
            published:
              action === "publish"
                ? true
                : action === "unpublish"
                  ? false
                  : draft.published,
          },
          bestSeller,
        );
      }}
    >
      <fieldset disabled={busy || uploading}>
        <div className="listing-edit-heading">
          <h1>Edit listing</h1>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
        <div className="listing-edit-fields">
          <label>
            Listing title
            <input
              required
              maxLength={150}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label>
            Regular price (USD)
            <span className="listing-edit-price">
              <span>$</span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={(e) =>
                  setDraft({ ...draft, price: Number(e.target.value) })
                }
              />
            </span>
          </label>
          <label>
            Optional sale price (USD)
            <span className="listing-edit-price">
              <span>$</span>
              <input
                type="number"
                min="0"
                max={draft.price}
                step="0.01"
                placeholder="49.99"
                value={draft.salePrice ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    salePrice:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  })
                }
              />
            </span>
          </label>
          <label>
            Etsy listing URL
            <input
              type="url"
              placeholder="https://www.etsy.com/listing/…"
              value={draft.etsyUrl ?? ""}
              onChange={(e) => setDraft({ ...draft, etsyUrl: e.target.value })}
            />
          </label>
          <label>
            Pinterest URL
            <input
              type="url"
              placeholder="https://www.pinterest.com/pin/…"
              value={draft.pinterestUrl ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, pinterestUrl: e.target.value })
              }
            />
          </label>
          <label>
            Category
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="listing-edit-help">
          Choose a category defined in your website settings.{" "}
          <Link href="/admin" target="_blank">
            Manage categories
          </Link>
        </p>
        <section className="listing-edit-media">
          <h2>Photo and video</h2>
          <p className="listing-edit-help">
            Show different angles, available options, or a peek behind the
            scenes.
          </p>
          <h3>Add up to 10 photos and 2 videos.</h3>
          <p className="listing-edit-help">
            The first photo is your listing thumbnail.
          </p>
          <div className="listing-edit-media-grid">
            {images.map((image, index) => (
              <div
                className="listing-edit-media-tile"
                key={`${image}-${index}`}
              >
                <ShopImage src={image} alt={`Listing photo ${index + 1}`} sizes="160px" />
                {index === 0 && (
                  <span className="listing-edit-primary">Primary</span>
                )}
                <div className="listing-edit-media-actions">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...images];
                        [next[0], next[index]] = [next[index], next[0]];
                        setDraft({ ...draft, images: next, image: next[0] });
                      }}
                    >
                      Make primary
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove photo ${index + 1}`}
                    onClick={() => {
                      const next = images.filter((_, i) => i !== index);
                      setDraft({
                        ...draft,
                        images: next,
                        image: next[0] ?? "",
                      });
                    }}
                  >
                    <ManagerIcon name="trash" />
                  </button>
                </div>
              </div>
            ))}
            {(draft.videos ?? []).map((video, index) => (
              <div className="listing-edit-media-tile" key={video}>
                <ShopVideo src={video} />
                <button
                  className="listing-edit-remove-video"
                  type="button"
                  aria-label={`Remove video ${index + 1}`}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      videos: draft.videos?.filter((_, i) => i !== index),
                    })
                  }
                >
                  <ManagerIcon name="trash" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="listing-edit-add-media"
              disabled={images.length >= 10}
              onClick={() => photos.current?.click()}
            >
              <ManagerIcon name="Banner Image" />
              <strong>Add photos</strong>
              <span>{10 - images.length} remaining</span>
            </button>
            <button
              type="button"
              className="listing-edit-add-media"
              disabled={(draft.videos?.length ?? 0) >= 2}
              onClick={() => videos.current?.click()}
            >
              <span aria-hidden="true">▷</span>
              <strong>Add videos</strong>
              <span>{2 - (draft.videos?.length ?? 0)} remaining</span>
            </button>
          </div>
          <input
            hidden
            ref={photos}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            hidden
            ref={videos}
            type="file"
            multiple
            accept="video/mp4,video/webm"
            onChange={(e) => {
              void upload(e.target.files, true);
              e.target.value = "";
            }}
          />
          {uploadStatus && <p role="status">{uploadStatus}</p>}
          <details className="listing-edit-image-url">
            <summary>Add a photo from an HTTPS URL</summary>
            <input
              type="url"
              placeholder="https://…"
              aria-label="Photo URL"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  try {
                    const url = new URL(e.currentTarget.value);
                    if (url.protocol !== "https:") throw new Error();
                    if (images.length >= 10) throw new Error();
                    setDraft({
                      ...draft,
                      images: [...images, url.toString()],
                      image: images[0] ?? url.toString(),
                    });
                    e.currentTarget.value = "";
                  } catch {
                    onError("Use an HTTPS photo URL, with up to 10 photos.");
                  }
                }
              }}
            />
            <p className="listing-edit-help">
              Enter a URL and press Enter to add it.
            </p>
          </details>
        </section>
        <p className="listing-edit-help">
          Sale prices apply when the store sale is enabled in website settings.
        </p>
        <label>
          Description
          <textarea
            required
            rows={14}
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={bestSeller}
            onChange={(e) => setBestSeller(e.target.checked)}
          />
          Mark as best seller
        </label>
        <p className="listing-edit-help">
          Best sellers appear on the homepage when published.
        </p>
        <p className="listing-edit-help">
          Etsy and Pinterest links are optional. Buttons appear when links are
          added. Current status: {draft.published ? "Published" : "Draft"}.
        </p>
        <div className="listing-edit-submit">
          <button type="submit" name="action" value="save">
            {busy ? "Saving…" : draft.published ? "Save changes" : "Save draft"}
          </button>
          <button
            className="primary"
            type="submit"
            name="action"
            value={draft.published ? "unpublish" : "publish"}
          >
            {draft.published ? "Unpublish listing" : "Publish listing"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
