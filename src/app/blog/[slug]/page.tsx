import { notFound } from "next/navigation";
import Link from "next/link";
import { backendApiUrl } from "@/lib/backend-api";
import { cdnImageUrl } from "@/lib/image-delivery";
import { loadPublicShopContent } from "@/lib/server-shop-content";
import { ShopFooter, ShopHeader } from "@/components/shop-frame";

type Blog = { title: string; slug: string; content: string; layout: string; updatedAt: string };
export default async function BlogArticle({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; let blog: Blog; try { const response = await fetch(backendApiUrl(`/blogs/${encodeURIComponent(slug)}`), { next: { revalidate: 60 } }); if (!response.ok) notFound(); blog = (await response.json()).blog; } catch { notFound(); }
  const content = blog.content.replace(/src="s3:([^" ]+)"/g, (_match, path: string) => `src="${cdnImageUrl(`s3:${path}`) ?? ""}"`);
  const shopContent = await loadPublicShopContent();
  return <><ShopHeader content={shopContent} /><main className={`blog-article blog-layout-${blog.layout}`}><Link href="/blog" className="blog-back">← All stories</Link><article><p className="eyebrow">{new Date(blog.updatedAt).toLocaleDateString("en", { dateStyle: "long" })}</p><h1>{blog.title}</h1><div className="blog-article-content" dangerouslySetInnerHTML={{ __html: content }} /></article></main><ShopFooter content={shopContent} /></>;
}
