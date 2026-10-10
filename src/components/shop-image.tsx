"use client";
import { useEffect, useState, type ImgHTMLAttributes } from "react";
import Image from "next/image";
import { getUrl, uploadData, remove } from "aws-amplify/storage";
import { cdnImageUrl, cdnImageVariantUrl, imageSrcSet, IMAGE_WIDTHS } from "@/lib/image-delivery";

const signedUrls = new Map<string, { url: string; expiresAt: number }>();
const pendingUrls = new Map<string, Promise<string>>();
export async function imageUrl(value: string, width = 1600): Promise<string> {
  const cdn = cdnImageVariantUrl(value, width);
  if (cdn) return cdn;
  if (!value.startsWith("s3:")) return value;
  const cached = signedUrls.get(value);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const pending = pendingUrls.get(value);
  if (pending) return pending;
  const request = getUrl({ path: value.slice(3), options: { expiresIn: 3600 } })
    .then((result) => {
      const url = result.url.toString();
      signedUrls.set(value, {
        url,
        expiresAt:
          Math.min(result.expiresAt.getTime(), Date.now() + 45 * 60 * 1000) -
          60000,
      });
      return url;
    })
    .finally(() => pendingUrls.delete(value));
  pendingUrls.set(value, request);
  return request;
}
export async function uploadImage(file: File) {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 8 * 1024 * 1024
  )
    throw new Error("Choose a PNG, JPEG, or WebP image up to 8 MB.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  if (bitmap.width * bitmap.height > 40_000_000 || bitmap.height / bitmap.width > 10) {
    bitmap.close();
    throw new Error("Choose an image up to 40 megapixels with a height no more than 10 times its width.");
  }
  const prefix = `media/${crypto.randomUUID()}`;
  const uploaded: string[] = [];
  try {
    // Prepare every variant before writing anything; unsupported WebP fails cleanly.
    const variants: { path: string; data: Blob }[] = [];
    for (const width of IMAGE_WIDTHS) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = Math.max(1, Math.round(bitmap.height * width / bitmap.width));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to prepare this image.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(result => result?.type === "image/webp"
          ? resolve(result) : reject(new Error("Your browser cannot create WebP images.")), "image/webp", 0.8);
      });
      variants.push({ path: `${prefix}/${width}.webp`, data: blob });
      canvas.width = canvas.height = 0;
    }
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const assets = [{ path: `${prefix}/original.${extension}`, data: file }, ...variants];
    // Limit concurrent uploads to two, including on slower admin connections.
    for (let index = 0; index < assets.length; index += 2) {
      const results = await Promise.allSettled(assets.slice(index, index + 2).map(async asset => {
        await uploadData({ path: asset.path, data: asset.data, options: {
          contentType: asset.data.type,
          cacheControl: "public, max-age=31536000, immutable",
        } }).result;
        uploaded.push(asset.path);
      }));
      const failure = results.find(result => result.status === "rejected");
      if (failure?.status === "rejected") throw failure.reason;
    }
    return `s3:${prefix}/1600.webp`;
  } catch (error) {
    await Promise.allSettled(uploaded.map(path => remove({ path })));
    throw error;
  } finally {
    bitmap.close();
  }
}
export default function ShopImage({
  src = "",
  alt = "",
  optimized = false,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & {
  src?: string;
  optimized?: boolean;
}) {
  const [resolved, setResolved] = useState<{
    source: string;
    url: string;
  } | null>(null);
  useEffect(() => {
    if (!src.startsWith("s3:") || cdnImageUrl(src)) return;
    let active = true;
    const resolve = () =>
      imageUrl(src)
        .then((url) => {
          if (active) setResolved({ source: src, url });
        })
        .catch(() => {
          if (active) setResolved(null);
        });
    void resolve();
    const timer = setInterval(resolve, 50 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [src]);
  const cdn = cdnImageUrl(src);
  const responsive = imageSrcSet(src);
  const url = cdn ?? (src.startsWith("s3:")
    ? resolved?.source === src
      ? resolved.url
      : undefined
    : src || undefined);
  if (optimized && !cdn && src.startsWith("s3:") && url) {
    return <Image {...props} src={url} width={1200} height={800} alt={alt} />;
  }
  // Variants are prepared at upload time; native srcset avoids a second optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img loading="lazy" decoding="async" {...props} src={url}
    srcSet={responsive ?? props.srcSet}
    sizes={props.sizes ?? (responsive ? "(max-width: 600px) 50vw, (max-width: 1024px) 33vw, 25vw" : undefined)}
    alt={alt} />;
}
