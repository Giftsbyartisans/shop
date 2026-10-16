import type { Metadata } from 'next';
import { siteOrigin } from './site-origin';

export async function pageMetadata(path: string, title: string, description: string): Promise<Metadata> {
  const url = new URL(path, await siteOrigin()).href;
  const fullTitle = `${title} | GiftsByArtisans`;
  const summary = description.replace(/\s+/g, ' ').trim().slice(0, 160);
  return {
    title: fullTitle,
    description: summary,
    alternates: { canonical: url },
    openGraph: { title: fullTitle, description: summary, url, siteName: 'GiftsByArtisans', type: 'website' },
    twitter: { card: 'summary', title: fullTitle, description: summary },
  };
}
