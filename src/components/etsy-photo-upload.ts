"use client";
import { backendApiUrl } from "@/lib/backend-api";
import { fetchTokenSession } from "@/lib/auth-session";
import { getProperties } from "aws-amplify/storage";
import type { Listing } from "@/lib/catalog";
import { etsyUploadId } from "@/lib/etsy-image-import";
import { mediaUploadPrefix } from "@/lib/media-paths";
import { uploadImage } from "./shop-image";

export async function createEtsyPhotoCopier() {
  const session = await fetchTokenSession();
  const token = session.tokens?.accessToken.toString();
  if (!token) throw new Error("Sign in before importing photos.");
  return async (source: string, listing: Listing): Promise<string> => {

                const uploadId = await etsyUploadId(listing.id, source);
                // Stable listing ID keeps reuse working even when its title changes.
                const context = { kind: "listing-images" as const, name: "etsy", entityId: listing.id };
                const filename = "etsy-photo";
                const path = `${mediaUploadPrefix(context, filename, uploadId)}/1600.webp`;
                try {
                  await getProperties({ path });
                  return `s3:${path}`;
                } catch {
                  // The authenticated API can verify an existing CDN copy when S3 HEAD fails.
                }
                const response = await fetch(backendApiUrl("/import-image"), {
                  method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ url: source, listingId: listing.id }), signal: AbortSignal.timeout(25000),
                });
                if (!response.ok) {
                  const result = await response.json();
                  throw new Error(result.error || "Photo download failed.");
                }
                if (response.headers.get("content-type")?.includes("application/json")) {
                  const result = await response.json();
                  if (result.sourceUrl) {
                    const imageResponse = await fetch(result.sourceUrl, { signal: AbortSignal.timeout(15000) });
                    if (!imageResponse.ok) throw new Error("Imported photo could not be retrieved.");
                    const blob = await imageResponse.blob();
                    return uploadImage(new File([blob], filename, { type: blob.type }), context, uploadId);
                  }
                  if (result.path !== `s3:${path}`) throw new Error("Unexpected uploaded photo path.");
                  return result.path;
                }
                const blob = await response.blob();
                return uploadImage(new File([blob], filename, { type: blob.type }), context, uploadId);

  };
}
