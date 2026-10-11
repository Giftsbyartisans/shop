"use client";
import { useRef, useState } from "react";
import type { Listing } from "@/lib/catalog";
import ShopImage from "./shop-image";
import ShopVideo from "./shop-video";
import VideoThumbnail from "./video-thumbnail";
export default function ListingGallery({ item }: { item: Listing }) {
  const images = item.images?.length ? item.images : [item.image];
  const media = [
    ...images.slice(0, 1).map((src, index) => ({
      type: "image" as const,
      src,
      label: `photo ${index + 1}`,
    })),
    ...(item.videos ?? []).map((src, index) => ({
      type: "video" as const,
      src,
      label: `video ${index + 1}`,
    })),
    ...images.slice(1).map((src, index) => ({
      type: "image" as const,
      src,
      label: `photo ${index + 2}`,
    })),
  ];
  const [index, setIndex] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const thumbnails = useRef<HTMLDivElement>(null);
  const active = index % media.length;
  const select = (next: number) => {
    const normalized = (next + media.length) % media.length;
    setIndex(normalized);
    const track = thumbnails.current;
    const button = track?.children[normalized] as HTMLElement | undefined;
    if (track && button)
      track.scrollTo({
        left: button.offsetLeft - track.offsetLeft,
        behavior: "smooth",
      });
  };
  return (
    <div>
      <div className="product-photo-carousel" role="region" aria-label="Product media" aria-roledescription="carousel"
        onKeyDown={event => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault(); select(active + (event.key === "ArrowLeft" ? -1 : 1));
          }
        }} tabIndex={media.length > 1 ? 0 : undefined}>
        <div className="product-photo-slide"
          onTouchStart={event => { const touch = event.touches[0]; start.current = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null; }}
          onTouchCancel={() => { start.current = null; }}
          onTouchEnd={event => {
            const origin = start.current; start.current = null;
            const touch = event.changedTouches[0];
            if (!origin || !touch || media.length < 2) return;
            const dx = touch.clientX - origin.x, dy = touch.clientY - origin.y;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) select(active + (dx < 0 ? 1 : -1));
          }}>
          {media[active].type === "image" ? (
            <ShopImage key={media[active].src} className="demo-detail-image" src={media[active].src} alt={`${item.title} — ${media[active].label}`}
              loading="eager" fetchPriority="high" sizes="(max-width: 768px) 90vw, 50vw" />
          ) : (
            <ShopVideo key={media[active].src} src={media[active].src} className="product-photo-video" />
          )}
        </div>
        {media.length > 1 && <>
          <button className="product-photo-arrow previous" type="button" aria-label="Previous product media" onClick={() => select(active - 1)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
          </button>
          <button className="product-photo-arrow next" type="button" aria-label="Next product media" onClick={() => select(active + 1)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg>
          </button>
          <span className="sr-only" aria-live="polite">Media {active + 1} of {media.length}</span>
        </>}
      </div>
      {media.length > 1 && (
        <div className="listing-detail-thumbnails product-photo-thumbnails" ref={thumbnails}>
          {media.map((entry, i) => (
            <button key={`${entry.type}-${entry.src}-${i}`} type="button"
              aria-label={`View ${entry.label}`}
              aria-pressed={active === i} onClick={() => select(i)}>
              {entry.type === "image" ? (
                <ShopImage src={entry.src} alt="" sizes="80px" />
              ) : (
                <VideoThumbnail src={entry.src} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
