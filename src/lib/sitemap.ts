import type { MetadataRoute } from "next";
import type { Listing } from "./catalog";

export function buildSitemap(origin: string, listings: Listing[], policies: { id: string }[] = []): MetadataRoute.Sitemap {
  const base = new URL(origin).origin;
  const entries: MetadataRoute.Sitemap = ["", "/collection", "/best-sellers", "/contact", "/wholesale"]
    .map(path => ({ url: `${base}${path}` }));
  const published = listings.filter(item => item.published);
  for (const id of new Set(policies.map(policy => policy.id).filter(Boolean))) entries.push({ url: `${base}/policies/${encodeURIComponent(id)}` });
  const categories = new Set(published.map(item => item.category).filter(Boolean));
  for (const category of categories) entries.push({ url: `${base}/collection/${encodeURIComponent(category)}` });
  for (const id of new Set(published.map(item => item.id))) entries.push({ url: `${base}/listing/${encodeURIComponent(id)}` });
  return entries;
}
