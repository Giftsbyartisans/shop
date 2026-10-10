"use client";
import { useState } from "react";
import type { Listing } from "@/lib/catalog";
import ShopImage from "./shop-image";
import ShopVideo from "./shop-video";
export default function ListingGallery({ item }: { item: Listing }) {
  const images = item.images?.length ? item.images : [item.image];
  const [index, setIndex] = useState(0);
  return (
    <div>
      <ShopImage
        className="demo-detail-image"
        src={images[index % images.length]}
        alt={item.title}
        loading="eager"
        fetchPriority="high"
        sizes="(max-width: 768px) 90vw, 50vw"
      />
      {images.length > 1 && (
        <div className="listing-detail-thumbnails">
          {images.map((image, i) => (
            <button
              key={`${image}-${i}`}
              aria-label={`View photo ${i + 1}`}
              aria-pressed={index === i}
              onClick={() => setIndex(i)}
            >
              <ShopImage src={image} alt="" sizes="80px" />
            </button>
          ))}
        </div>
      )}
      {item.videos?.map((video) => (
        <ShopVideo key={video} src={video} className="listing-detail-video" />
      ))}
    </div>
  );
}
