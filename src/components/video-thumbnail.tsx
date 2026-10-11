"use client";

import { useEffect, useRef, useState } from "react";
import { imageUrl } from "./shop-image";

export default function VideoThumbnail({ src }: { src: string }) {
  const element = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      void imageUrl(src).then(value => { if (active) setUrl(value); })
        .catch(() => { if (active) setFailed(true); });
    }, { rootMargin: "150px" });
    if (element.current) observer.observe(element.current);
    return () => { active = false; observer.disconnect(); };
  }, [src]);

  return (
    <span className="video-thumbnail">
      <video ref={element} src={url} muted playsInline preload="metadata" aria-hidden="true"
        onLoadedMetadata={event => {
          const video = event.currentTarget;
          if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = Math.min(0.1, video.duration / 2);
        }}
        onError={() => setFailed(true)} />
      <span className="video-thumbnail-play" aria-hidden="true">▶</span>
      {failed && <span className="video-thumbnail-error">Preview unavailable</span>}
    </span>
  );
}
