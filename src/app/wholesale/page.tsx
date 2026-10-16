import { Suspense } from "react";
import { loadPublicShopContent } from "@/lib/server-shop-content";
import { pageMetadata } from "@/lib/page-metadata";
import Storefront from '@/components/storefront';
async function Content() {
  const initialContent = await loadPublicShopContent();
  return <Storefront page="wholesale" initialContent={initialContent} initialListings={[]} />;
}
export default function Page() {
  return <Suspense fallback={<main className="info-page"><p role="status">Loading…</p></main>}><Content /></Suspense>;
}

export async function generateMetadata() {
  return pageMetadata('/wholesale', 'Wholesale inquiries', 'Ask GiftsByArtisans about wholesale orders, bulk gifts, and artisan-made products for your business.');
}
