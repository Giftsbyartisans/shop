"use client";
import { useEffect, useRef, useState } from "react";
import { imageUrl } from "./shop-image";
export default function ShopVideo({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [resolved, setResolved] = useState<{ src: string; url: string } | null>(
    null,
  );
  const [autoplayFailed, setAutoplayFailed] = useState(false);
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
  useEffect(() => {
    const element = video.current;
    if (!element || resolved?.src !== src) return;
    if (!("IntersectionObserver" in window)) {
      void element.play().catch(() => setAutoplayFailed(true));
      return () => element.pause();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void element.play().catch(() => setAutoplayFailed(true));
        } else {
          element.pause();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      element.pause();
    };
  }, [resolved, src]);

  const togglePlayback = () => {
    const element = video.current;
    if (!element) return;
    if (element.paused) {
      void element.play().catch(() => setAutoplayFailed(true));
    } else {
      element.pause();
    }
  };

  return (
    <div className="shop-video-player">
      <video
        ref={video}
        className={className}
        src={resolved?.src === src ? resolved.url : undefined}
        controls={false}
        muted
        playsInline
        preload="metadata"
        aria-label="Video. Click or press Space to play or pause."
        tabIndex={0}
        onClick={togglePlayback}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            togglePlayback();
          }
        }}
        onPlay={() => setAutoplayFailed(false)}
      />
      {autoplayFailed && (
        <span className="shop-video-autoplay-message" role="status">
          Autoplay unavailable. Click the video to play.
        </span>
      )}
    </div>
  );
}
