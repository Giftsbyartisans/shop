import { Suspense } from 'react';
import type { Metadata } from 'next';
import { preconnect } from 'react-dom';
import Storefront from '@/components/storefront';
import { mediaCdnUrl } from '@/lib/image-delivery';
import { loadPublicCatalog, loadPublicShopContent } from '@/lib/server-shop-content';

export const metadata: Metadata = { title: 'Best sellers | GiftsByArtisans' };
export default function Page() {
  return <Suspense fallback={<main className="shop collection"><p role="status">Loading best sellers…</p></main>}><BestSellers /></Suspense>;
}
async function BestSellers() {
  if (mediaCdnUrl) preconnect(mediaCdnUrl);
  const [initialContent, initialListings] = await Promise.all([loadPublicShopContent(), loadPublicCatalog()]);
  return <Storefront page="collection" bestSellersOnly initialContent={initialContent} initialListings={initialListings} />;
}
