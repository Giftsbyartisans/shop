import { listingPath, resolveListing } from "@/lib/listing-url";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/page-metadata";
import ShopSkeleton from "@/components/shop-skeleton";
import { Suspense } from 'react';
import { preconnect, preload } from 'react-dom';
import Storefront from '@/components/storefront';
import { mediaCdnUrl, cdnImageUrl, imageSrcSet } from '@/lib/image-delivery';
import { loadPublicCatalog, loadPublicShopContent } from '@/lib/server-shop-content';
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<ShopSkeleton variant="product" />}><Listing params={params} /></Suspense>;
}
async function Listing({ params }: { params: Promise<{ id: string }> }) {
  if (mediaCdnUrl) preconnect(mediaCdnUrl);
  const [{ id }, initialContent, initialListings] = await Promise.all([params, loadPublicShopContent(), loadPublicCatalog()]);
  const item = resolveListing(id, initialListings);
  if (!item) notFound();
  const photo = item.images?.[0] || item.image;
  const url = photo && cdnImageUrl(photo);
  if (url && photo) preload(url, { as: 'image', fetchPriority: 'high', imageSrcSet: imageSrcSet(photo), imageSizes: '(max-width: 768px) 90vw, 50vw' });
  return <Storefront page="listing" id={item.id} initialContent={initialContent} initialListings={initialListings} />;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, listings] = await Promise.all([params, loadPublicCatalog()]);
  const item = resolveListing(id, listings);
  if (!item) notFound();
  return pageMetadata(listingPath(item), item.title, item.description);
}
