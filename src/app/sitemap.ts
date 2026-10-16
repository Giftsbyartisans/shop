import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { siteOrigin } from "@/lib/site-origin";
import { buildSitemap } from "@/lib/sitemap";
import { loadPublicCatalog, loadPublicShopContent } from "@/lib/server-shop-content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [origin, listings, content] = await Promise.all([siteOrigin(), loadPublicCatalog(), loadPublicShopContent()]);
  return buildSitemap(origin, listings, content.policies);
}
