import { connection } from 'next/server';
import { buildGoogleMerchantFeed } from '@/lib/google-merchant-feed';
import { loadPublicCatalog, loadPublicShopContent } from '@/lib/server-shop-content';
import { siteOrigin } from '@/lib/site-origin';
import { mediaCdnUrl } from '@/lib/image-delivery';

export async function GET() {
  await connection();
  try {
    const [origin, listings, content] = await Promise.all([siteOrigin(), loadPublicCatalog(), loadPublicShopContent()]);
    const feed = buildGoogleMerchantFeed(origin, listings, content, mediaCdnUrl);
    return new Response(feed, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
  } catch {
    // Never replace a working Merchant Center catalog with an empty feed during
    // a catalog outage or when a published product contains invalid feed data.
    return new Response('Product feed is temporarily unavailable. Please retry.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
}
