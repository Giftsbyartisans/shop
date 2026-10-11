import ShopSkeleton from "@/components/shop-skeleton";
import { Suspense } from 'react';
import { preconnect } from 'react-dom';
import Storefront from '@/components/storefront';
import { mediaCdnUrl } from '@/lib/image-delivery';
import { loadPublicCatalog, loadPublicShopContent } from '@/lib/server-shop-content';
async function Collection() {
  if (mediaCdnUrl) preconnect(mediaCdnUrl);
  const [initialContent, initialListings] = await Promise.all([loadPublicShopContent(), loadPublicCatalog()]);
  return <Storefront page="collection" initialContent={initialContent} initialListings={initialListings} />;
}
export default function Page() {
  return <Suspense fallback={<ShopSkeleton variant="collection" />}><Collection /></Suspense>;
}
