import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/page-metadata";
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
  if (!initialListings.some(listing => listing.category === categoryName)) notFound();
  return <Storefront key={categoryName} page="collection" categoryOnly={categoryName} initialContent={initialContent} initialListings={initialListings} />;
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const [{ category }, listings] = await Promise.all([params, loadPublicCatalog()]);
  let name = category;
  if (!listings.some(item => item.category === name)) {
    try { name = decodeURIComponent(category); } catch { /* Invalid categories return 404. */ }
  }
  if (!listings.some(item => item.category === name)) notFound();
  return pageMetadata(`/collection/${encodeURIComponent(name)}`, name, `Explore ${name.toLowerCase()} from GiftsByArtisans. Discover handcrafted pieces and thoughtful gifts in our collection.`);
}
