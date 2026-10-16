import { pageMetadata } from "@/lib/page-metadata";
import ShopSkeleton from "@/components/shop-skeleton";
import { Suspense } from 'react';
import { preconnect } from 'react-dom';
import Storefront from '@/components/storefront';
import { mediaCdnUrl } from '@/lib/image-delivery';
import { loadPublicCatalog, loadPublicShopContent } from '@/lib/server-shop-content';


export default function Page() {
  return <Suspense fallback={<ShopSkeleton variant="collection" />}><BestSellers /></Suspense>;
}
async function BestSellers() {
  if (mediaCdnUrl) preconnect(mediaCdnUrl);
  const [initialContent, initialListings] = await Promise.all([loadPublicShopContent(), loadPublicCatalog()]);
  return <Storefront page="collection" bestSellersOnly initialContent={initialContent} initialListings={initialListings} />;
}

export async function generateMetadata() {
  return pageMetadata('/best-sellers', 'Best sellers', 'Discover our best-selling handcrafted gifts and personalized favorites.');
}
