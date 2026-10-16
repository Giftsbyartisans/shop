import Link from 'next/link';
import { Suspense } from 'react';
import { ShopHeader, ShopFooter } from '@/components/shop-frame';
import { defaultContent, type ShopContent } from '@/lib/content';
import { loadPublicShopContent } from '@/lib/server-shop-content';

function NotFoundPage({ content }: { content: ShopContent }) {
  return <>
    <ShopHeader content={content} />
    <main className="shop not-found-page">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>We couldn’t find the page you’re looking for.</p>
      <Link className="primary cart-empty-continue" href="/collection">Explore our collection</Link>
    </main>
    <ShopFooter content={content} />
  </>;
}

async function ShopNotFound() {
  let content = defaultContent;
  try { content = await loadPublicShopContent(); }
  catch { /* Keep navigation available even when public settings are unavailable. */ }
  return <NotFoundPage content={content} />;
}

export default function NotFound() {
  return <Suspense fallback={<NotFoundPage content={defaultContent} />}><ShopNotFound /></Suspense>;
}
