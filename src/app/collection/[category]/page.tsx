import ShopSkeleton from "@/components/shop-skeleton";
import { Suspense } from 'react';
import { preconnect } from 'react-dom';
import Storefront from '@/components/storefront';
import { mediaCdnUrl } from '@/lib/image-delivery';
import { loadPublicCatalog, loadPublicShopContent } from '@/lib/server-shop-content';

export default function Page({ params }: { params: Promise<{ category: string }> }) {
  return <Suspense fallback={<ShopSkeleton variant="collection" />}><CategoryCollection params={params} /></Suspense>;
}
async function CategoryCollection({ params }: { params: Promise<{ category: string }> }) {
  if (mediaCdnUrl) preconnect(mediaCdnUrl);
  const [{ category }, initialContent, initialListings] = await Promise.all([params, loadPublicShopContent(), loadPublicCatalog()]);
  // Route params can retain percent escapes; match the original category label.
  let categoryName = category;
  const knownCategory = initialListings?.some(listing => listing.category === category)
    || initialContent?.categories.some(entry => entry.name === category);
  if (!knownCategory) {
    try { categoryName = decodeURIComponent(category); }
    catch { /* Keep malformed escapes as text rather than failing the page. */ }
  }
  return <Storefront key={categoryName} page="collection" categoryOnly={categoryName} initialContent={initialContent} initialListings={initialListings} />;
}
