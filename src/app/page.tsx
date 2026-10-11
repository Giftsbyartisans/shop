import ShopSkeleton from "@/components/shop-skeleton";
import { Suspense } from 'react';
import { preconnect, preload } from 'react-dom';
import { cdnImageUrl, imageSrcSet, mediaCdnUrl } from '@/lib/image-delivery';
import Storefront from '@/components/storefront';
import { loadPublicShopContent, loadPublicCatalog } from '@/lib/server-shop-content';

async function HomeContent() {
  if (mediaCdnUrl) preconnect(mediaCdnUrl);
  const [initialContent, initialListings] = await Promise.all([loadPublicShopContent(), loadPublicCatalog()]);
  const hero = initialContent?.banners.find(banner => banner.image.trim());
  const heroUrl = hero && cdnImageUrl(hero.image);
  if (heroUrl && hero) preload(heroUrl, { as: 'image', fetchPriority: 'high', imageSrcSet: imageSrcSet(hero.image), imageSizes: '100vw' });
  return <Storefront initialContent={initialContent} initialListings={initialListings} />;
}
export default function Home() {
  return <Suspense fallback={<ShopSkeleton variant="home" />}><HomeContent /></Suspense>;
}
