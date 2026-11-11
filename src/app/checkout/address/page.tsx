import { Suspense } from "react";
import Storefront from "@/components/storefront";
import CheckoutLoading from "@/components/checkout-loading";
import { loadPublicCatalog, loadPublicShopContent } from "@/lib/server-shop-content";

async function CheckoutPage() {
  const [initialContent, initialListings] = await Promise.all([loadPublicShopContent(), loadPublicCatalog()]);
  return <Storefront page="checkout-address" initialContent={initialContent} initialListings={initialListings} />;
}

export default function Page() {
  return <Suspense fallback={<CheckoutLoading header />}><CheckoutPage /></Suspense>;
}
