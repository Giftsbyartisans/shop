import 'server-only';
import { cacheLife } from 'next/cache';
import { connection } from 'next/server';
import { backendApiUrl } from './backend-api';
import { catalogWithNumbers, parsePublicCatalog, PUBLIC_CATALOG_PATH } from './public-catalog';
import type { Listing } from './catalog';
import { mediaCdnUrl } from './image-delivery';
import { parsePublicShopContent, PUBLIC_SETTINGS_PATH } from './public-shop-content';

async function loadStorefrontFallback() {
  'use cache';
  cacheLife({ stale: 0, revalidate: 30, expire: 60 });
  const response = await fetch(backendApiUrl('/storefront'), { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Public storefront API returned HTTP ${response.status}. Deploy the updated shop backend.`);
  const data = await response.json();
  return { listings: parsePublicCatalog(data.listings), content: parsePublicShopContent(data.content) };
}

async function cachedShopContent() {
  'use cache';
  cacheLife({ stale: 0, revalidate: 30, expire: 60 });
  if (mediaCdnUrl) {
    try {
      const response = await fetch(`${mediaCdnUrl}/${PUBLIC_SETTINGS_PATH}`, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return parsePublicShopContent(await response.json());
    } catch { /* Fall back to the authoritative public records. */ }
  }
  return (await loadStorefrontFallback()).content;
}

async function cachedCatalog() {
  'use cache';
  cacheLife({ stale: 0, revalidate: 30, expire: 60 });
  let snapshot: Listing[] | undefined;
  if (mediaCdnUrl) {
    try {
      const response = await fetch(`${mediaCdnUrl}/${PUBLIC_CATALOG_PATH}`, { signal: AbortSignal.timeout(1500) });
      if (response.ok) {
        snapshot = parsePublicCatalog(await response.json());
      }
    } catch { /* Fall back to the authoritative public records. */ }
  }
  return catalogWithNumbers(snapshot, async () => (await loadStorefrontFallback()).listings);
}

// Resolve public data at request time so deployment builds do not depend on a
// live backend. The underlying snapshots remain shared in Next's server cache.
export async function loadPublicShopContent() {
  await connection();
  return cachedShopContent();
}

export async function loadPublicCatalog() {
  await connection();
  return cachedCatalog();
}
