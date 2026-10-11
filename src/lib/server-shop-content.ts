import 'server-only';
import { cacheLife } from 'next/cache';
import { parsePublicCatalog, PUBLIC_CATALOG_PATH } from './public-catalog';
import { mediaCdnUrl } from './image-delivery';
import { parsePublicShopContent, PUBLIC_SETTINGS_PATH } from './public-shop-content';

export async function loadPublicShopContent() {
  'use cache';
  cacheLife({ stale: 0, revalidate: 30, expire: 60 });
  if (!mediaCdnUrl) return undefined;
  try {
    const response = await fetch(`${mediaCdnUrl}/${PUBLIC_SETTINGS_PATH}`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return undefined;
    return parsePublicShopContent(await response.json());
  } catch {
    // Older deployments or unavailable CDN still load settings through Amplify.
    return undefined;
  }
}

export async function loadPublicCatalog() {
  'use cache';
  cacheLife({ stale: 0, revalidate: 30, expire: 60 });
  if (!mediaCdnUrl) return undefined;
  try {
    const response = await fetch(`${mediaCdnUrl}/${PUBLIC_CATALOG_PATH}`, { signal: AbortSignal.timeout(1500) });
    if (!response.ok) return undefined;
    return parsePublicCatalog(await response.json());
  } catch { return undefined; }
}
