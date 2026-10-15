import { Suspense } from 'react';
import OrderConfirmation from '@/components/order-confirmation';
export const metadata = { title:'Order confirmation | GiftsByArtisans',robots:{index:false,follow:false} };
export default function Page({params}:{params:Promise<{id:string}>}) {
  return <Suspense fallback={<main className="shop"><p>Loading order confirmation…</p></main>}><ConfirmationPage params={params} /></Suspense>;
}
async function ConfirmationPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;return <OrderConfirmation id={id} />;
}
