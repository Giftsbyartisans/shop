"use client";
import { useEffect, useRef, useState } from "react";
import { Editor } from "@tinymce/tinymce-react";
import Link from "next/link";
import { backendApiUrl } from "@/lib/backend-api";
import { fetchTokenSession } from "@/lib/auth-session";
import { uploadImage } from "@/components/shop-image";
import { cdnImageUrl } from "@/lib/image-delivery";

type Blog = { id: string; title: string; slug: string; content: string; layout: string; published: boolean; updatedAt: string };
async function api(path: string, method = "GET", data?: unknown) {
  const session = await fetchTokenSession(); const token = session.tokens?.accessToken.toString();
  if (!token) throw new Error("Admin sign-in required.");
  const response = await fetch(backendApiUrl(path), { method, headers: { Authorization: `Bearer ${token}`, ...(data ? { "Content-Type": "application/json" } : {}) }, body: data ? JSON.stringify(data) : undefined, cache: "no-store" });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || "Blog request failed."); return result;
}
export default function AdminBlogs() {
  const [blogs, setBlogs] = useState<Blog[]>([]), [current, setCurrent] = useState<Blog | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const editor = useRef<{ getContent: () => string } | null>(null);
  async function refresh() { const result = await api("/admin/blogs"); setBlogs(result.blogs); }
  useEffect(() => { void refresh().catch(error => setMessage(error.message)); }, []);
  function create() { const blog = { id: crypto.randomUUID(), title: "", slug: "", content: "", layout: "stacked", published: false, updatedAt: "" }; setCurrent(blog); setMessage(""); }
  function edit(blog: Blog) { setCurrent(blog); setMessage(""); }
  async function save(published = current?.published ?? false) {
    if (!current) return; setBusy(true); setMessage("");
    try { const result = await api(`/admin/blogs/${current.id}`, "PUT", { title: current.title, content: editor.current?.getContent() ?? current.content, layout: current.layout, published }); setCurrent(result.blog); await refresh(); setMessage(published ? "Blog published." : "Draft saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save blog."); } finally { setBusy(false); }
  }
  async function uploadEditorImage(blob: Blob, filename: string, progress: (percent: number) => void) {
    const file = new File([blob], filename || "blog-image", { type: blob.type });
    progress(10);
    const source = await uploadImage(file, { kind: "images", name: "blog", entityId: current?.id });
    const url = cdnImageUrl(source);
    if (!url) throw new Error("Uploaded image could not be loaded.");
    progress(100);
    return url;
  }
  async function remove(blog: Blog) { if (!window.confirm(`Delete “${blog.title}”?`)) return; try { await api(`/admin/blogs/${blog.id}`, "DELETE"); setBlogs(value => value.filter(item => item.id !== blog.id)); if (current?.id === blog.id) setCurrent(null); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not delete blog."); } }
  if (!current) return <section className="admin-blogs"><div className="admin-blogs-heading"><p>Create and publish articles for your customers.</p><button type="button" onClick={create}>New blog</button></div>{message && <p role="status">{message}</p>}{blogs.length ? blogs.map(blog => <article className="admin-blog-row" key={blog.id}><div><strong>{blog.title || "Untitled blog"}</strong><small>{blog.published ? "Published" : "Draft"} · Updated {new Date(blog.updatedAt).toLocaleDateString()}</small></div>{blog.published && <Link href={`/blog/${encodeURIComponent(blog.slug)}`} target="_blank" rel="noopener noreferrer">View</Link>}<button type="button" onClick={() => edit(blog)}>Edit</button><button type="button" onClick={() => void remove(blog)}>Delete</button></article>) : <p>No blogs yet. Start with your first post.</p>}</section>;
  const initialContent = current.content.replace(/src="s3:([^" ]+)"/g, (_match, path: string) => `src="${cdnImageUrl(`s3:${path}`) ?? ""}"`);
  return <section className="admin-blogs admin-blog-editor"><button type="button" onClick={() => setCurrent(null)}>← All blogs</button><label>Title<input value={current.title} maxLength={180} onChange={event => setCurrent({ ...current, title: event.target.value })} placeholder="Give your blog a title" /></label><label>Article layout<select value={current.layout} onChange={event => setCurrent({ ...current, layout: event.target.value })}><option value="stacked">Text and images stacked</option><option value="image-left">Images on the left</option><option value="image-right">Images on the right</option></select></label><Editor key={current.id} tinymceScriptSrc="/tinymce/tinymce.min.js" licenseKey="gpl" onInit={(_event, instance) => { editor.current = instance; }} initialValue={initialContent} init={{ height: 500, menubar: false, plugins: "advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount", toolbar: "undo redo | blocks | bold italic underline | alignleft aligncenter alignright | bullist numlist | link image table | removeformat", images_upload_handler: (blobInfo, progress) => uploadEditorImage(blobInfo.blob(), blobInfo.filename(), progress), automatic_uploads: true, paste_data_images: true, image_caption: true, object_resizing: true, content_style: "body { font-family: Arial, sans-serif; font-size: 16px; line-height: 1.7; } img { max-width: 100%; height: auto; }" }} /><div className="admin-blog-actions"><button type="button" disabled={busy} onClick={() => void save(false)}>Save draft</button><button type="button" disabled={busy || !current.title.trim()} onClick={() => void save(true)}>Publish</button>{message && <span role="status">{message}</span>}</div></section>;
}
