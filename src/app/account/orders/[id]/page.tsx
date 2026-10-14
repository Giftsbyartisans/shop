import { Suspense } from "react";
import OrderDetail from "@/components/order-detail";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<main className="shop"><p>Loading order…</p></main>}><OrderPage params={params} /></Suspense>;
}
async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}
