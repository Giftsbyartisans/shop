import { Suspense } from 'react';
import { preconnect, preload } from 'react-dom';
import Storefront from '@/components/storefront';
import { mediaCdnUrl, cdnImageUrl, imageSrcSet } from '@/lib/image-delivery';
import { loadPublicCatalog, loadPublicShopContent } from '@/lib/server-shop-content';
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<main className="shop collection"><p role="status">Loading product…</p></main>}><Listing params={params} /></Suspense>;
}
async function Listing({ params }: { params: Promise<{ id: string }> }) {
  if (mediaCdnUrl) preconnect(mediaCdnUrl);
  const [{ id }, initialContent, initialListings] = await Promise.all([params, loadPublicShopContent(), loadPublicCatalog()]);
  const item = initialListings?.find(item => item.id === id);
  const photo = item?.images?.[0] || item?.image;
  const url = photo && cdnImageUrl(photo);
  if (url && photo) preload(url, { as: 'image', fetchPriority: 'high', imageSrcSet: imageSrcSet(photo), imageSizes: '(max-width: 768px) 90vw, 50vw' });
  return <Storefront page="listing" id={id} initialContent={initialContent} initialListings={initialListings} />;
}
