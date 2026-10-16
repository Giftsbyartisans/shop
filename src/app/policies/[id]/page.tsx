import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import Storefront from "@/components/storefront";
import { loadPublicShopContent } from "@/lib/server-shop-content";

async function Policy({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, initialContent] = await Promise.all([params, loadPublicShopContent()]);
  if (!initialContent.policies.some(policy => policy.id === id)) notFound();
  return <Storefront page="policies" id={id} initialContent={initialContent} />;
}
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<main className="info-page"><p role="status">Loading policy…</p></main>}><Policy params={params} /></Suspense>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, content] = await Promise.all([params, loadPublicShopContent()]);
  const policy = content.policies.find(item => item.id === id);
  if (!policy) notFound();
  return pageMetadata(`/policies/${encodeURIComponent(id)}`, policy.title, policy.text);
}
