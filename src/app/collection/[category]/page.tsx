import { Suspense } from 'react';
import { preconnect } from 'react-dom';
import Storefront from '@/components/storefront';
import { mediaCdnUrl } from '@/lib/image-delivery';
import { loadPublicCatalog, loadPublicShopContent } from '@/lib/server-shop-content';

export default function Page({ params }: { params: Promise<{ category: string }> }) {
  return <Suspense fallback={<main className="shop collection"><p role="status">Loading products…</p></main>}><CategoryCollection params={params} /></Suspense>;
}
async function CategoryCollection({ params }: { params: Promise<{ category: string }> }) {
  if (mediaCdnUrl) preconnect(mediaCdnUrl);
  const [{ category }, initialContent, initialListings] = await Promise.all([params, loadPublicShopContent(), loadPublicCatalog()]);
  return <Storefront key={category} page="collection" categoryOnly={category} initialContent={initialContent} initialListings={initialListings} />;
}
