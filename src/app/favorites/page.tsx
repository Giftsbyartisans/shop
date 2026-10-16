import { Suspense } from "react";
import Storefront from "@/components/storefront";
import { loadPublicCatalog, loadPublicShopContent } from "@/lib/server-shop-content";

async function Shopping() {
  const [initialContent, initialListings] = await Promise.all([
    loadPublicShopContent(), loadPublicCatalog(),
  ]);
  return <Storefront page="favorites" initialContent={initialContent} initialListings={initialListings} />;
}

export default function Page() {
  return <Suspense fallback={<main className="shop shopping-page"><p role="status">Loading…</p></main>}><Shopping /></Suspense>;
}
