import { Suspense } from "react";
import OrderDetail from "@/components/order-detail";
import { ShopFooter } from "@/components/shop-frame";
import { loadPublicShopContent } from "@/lib/server-shop-content";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <><Suspense fallback={<main className="shop"><p>Loading order…</p></main>}><OrderPage params={params} /></Suspense><Suspense fallback={null}><OrderFooter /></Suspense></>;
}
async function OrderFooter() {
  const content = await loadPublicShopContent();
  return <ShopFooter content={content} />;
}
async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}
