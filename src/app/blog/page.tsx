import Link from "next/link";
import { pageMetadata } from "@/lib/page-metadata";
import { backendApiUrl } from "@/lib/backend-api";
import { loadPublicShopContent } from "@/lib/server-shop-content";
import { ShopFooter, ShopHeader } from "@/components/shop-frame";

type Blog = { id: string; title: string; slug: string; excerpt: string; updatedAt: string };
async function getBlogs(): Promise<Blog[]> { try { const response = await fetch(backendApiUrl("/blogs"), { next: { revalidate: 60 } }); if (!response.ok) return []; return (await response.json()).blogs; } catch { return []; } }
export default async function BlogIndex() { const [blogs, content] = await Promise.all([getBlogs(), loadPublicShopContent()]); return <><ShopHeader content={content} /><main className="blog-index"><p className="eyebrow">Stories & inspiration</p><h1>Our Blog</h1><p>Ideas, stories, and thoughtful inspiration from Gifts By Artisans.</p><div className="blog-list">{blogs.length ? blogs.map(blog => <article key={blog.id}><p className="eyebrow">{new Date(blog.updatedAt).toLocaleDateString("en", { dateStyle: "long" })}</p><h2><Link href={"/blog/" + encodeURIComponent(blog.slug)}>{blog.title}</Link></h2><p>{blog.excerpt}</p><Link className="blog-read" href={"/blog/" + encodeURIComponent(blog.slug)}>Read story →</Link></article>) : <p>New stories are coming soon.</p>}</div></main><ShopFooter content={content} /></>; }
export function generateMetadata() { return pageMetadata("/blog", "Stories & inspiration", "Read stories, ideas, and inspiration from Gifts By Artisans."); }
