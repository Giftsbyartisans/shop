"use client";
import { useRef, useState } from "react";
import type { Listing } from "@/lib/catalog";
import ShopImage from "./shop-image";
import ShopVideo from "./shop-video";
export default function ListingGallery({ item }: { item: Listing }) {
  const images = item.images?.length ? item.images : [item.image];
  const [index, setIndex] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const thumbnails = useRef<HTMLDivElement>(null);
  const active = index % images.length;
  const select = (next: number) => {
    const normalized = (next + images.length) % images.length;
    setIndex(normalized);
    const track = thumbnails.current;
    const button = track?.children[normalized] as HTMLElement | undefined;
    if (track && button)
      track.scrollTo({
        left: button.offsetLeft - track.offsetLeft,
        behavior: "auto",
      });
  };
  return (
    <div>
      <div className="product-photo-carousel" role="region" aria-label="Product photos" aria-roledescription="carousel"
        onKeyDown={event => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault(); select(active + (event.key === "ArrowLeft" ? -1 : 1));
          }
        }} tabIndex={images.length > 1 ? 0 : undefined}>
        <div className="product-photo-slide"
          onTouchStart={event => { const touch = event.touches[0]; start.current = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null; }}
          onTouchCancel={() => { start.current = null; }}
          onTouchEnd={event => {
            const origin = start.current; start.current = null;
            const touch = event.changedTouches[0];
            if (!origin || !touch || images.length < 2) return;
            const dx = touch.clientX - origin.x, dy = touch.clientY - origin.y;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) select(active + (dx < 0 ? 1 : -1));
          }}>
          <ShopImage key={images[active]} className="demo-detail-image" src={images[active]} alt={`${item.title} — photo ${active + 1}`}
            loading="eager" fetchPriority="high" sizes="(max-width: 768px) 90vw, 50vw" />
        </div>
        {images.length > 1 && <>
          <button className="product-photo-arrow previous" type="button" aria-label="Previous product photo" onClick={() => select(active - 1)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
          </button>
          <button className="product-photo-arrow next" type="button" aria-label="Next product photo" onClick={() => select(active + 1)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg>
          </button>
          <span className="sr-only" aria-live="polite">Photo {active + 1} of {images.length}</span>
        </>}
      </div>
      {images.length > 1 && (
        <div className="listing-detail-thumbnails product-photo-thumbnails" ref={thumbnails}>
          {images.map((image, i) => (
            <button key={`${image}-${i}`} type="button" aria-label={`View photo ${i + 1}`} aria-pressed={active === i} onClick={() => select(i)}>
              <ShopImage src={image} alt="" sizes="80px" />
            </button>
          ))}
        </div>
      )}
      {item.videos?.map(video => <ShopVideo key={video} src={video} className="listing-detail-video" />)}
    </div>
  );
}
