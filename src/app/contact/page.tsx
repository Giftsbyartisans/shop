import { Suspense } from "react";
import { loadPublicShopContent } from "@/lib/server-shop-content";
import { pageMetadata } from "@/lib/page-metadata";
import Storefront from '@/components/storefront';
async function Content() {
  const initialContent = await loadPublicShopContent();
  return <Storefront page="contact" initialContent={initialContent} initialListings={[]} />;
}
export default function Page() {
  return <Suspense fallback={<main className="info-page"><p role="status">Loading…</p></main>}><Content /></Suspense>;
}

export async function generateMetadata() {
  return pageMetadata('/contact', 'Contact us', 'Contact GiftsByArtisans for help with products, personalization, shipping, and your order.');
}
