import { Suspense } from "react";
import Storefront from "@/components/storefront";
import { loadPublicShopContent } from "@/lib/server-shop-content";

async function Policy({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, initialContent] = await Promise.all([params, loadPublicShopContent()]);
  return <Storefront page="policies" id={id} initialContent={initialContent} />;
}
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<main className="info-page"><p role="status">Loading policy…</p></main>}><Policy params={params} /></Suspense>;
}
