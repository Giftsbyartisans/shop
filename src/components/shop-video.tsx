"use client";
import { useEffect, useState } from "react";
import { imageUrl } from "./shop-image";
export default function ShopVideo({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [resolved, setResolved] = useState<{ src: string; url: string } | null>(
    null,
  );
  useEffect(() => {
    let active = true;
    const resolve = () =>
      imageUrl(src)
        .then((url) => {
          if (active) setResolved({ src, url });
        })
        .catch(() => {});
    void resolve();
    const timer = setInterval(resolve, 50 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [src]);
  return (
    <video
      className={className}
      src={resolved?.src === src ? resolved.url : undefined}
      controls
      preload="metadata"
    />
  );
}
