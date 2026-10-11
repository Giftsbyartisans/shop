import type { Listing } from './catalog';

export function isEtsyImage(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      /^(i|img[0-4])\.etsystatic\.com$/.test(url.hostname);
  } catch { return false; }
}

export async function copyEtsyImages(listings: Listing[], copy: (source: string, listing: Listing) => Promise<string>, progress: (done: number, total: number) => void) {
  const total = listings.reduce((sum, item) => sum + new Set([item.image, ...(item.images ?? [])].filter(isEtsyImage)).size, 0);
  let done = 0;
  const warnings: string[] = [];
  const result: Listing[] = [];
  for (const listing of listings) {
    const replacements = new Map<string, string>();
    let failed = false;
    for (const source of new Set([listing.image, ...(listing.images ?? [])].filter(isEtsyImage))) {
      try { replacements.set(source, await copy(source, listing)); }
      catch (error) {
        failed = true;
        warnings.push(`${listing.title}: ${error instanceof Error ? error.message : 'Photo import failed'}`);
      }
      progress(++done, total);
    }
    result.push({ ...listing, published: failed ? false : listing.published,
      image: replacements.get(listing.image) ?? listing.image,
      images: listing.images?.map(source => replacements.get(source) ?? source) });
  }
  return { listings: result, warnings };
}

export async function etsyUploadId(listingId: string, source: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([listingId, source])))).slice(0, 16);
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
