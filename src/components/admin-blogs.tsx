"use client";
import { useEffect, useRef, useState } from "react";
import { backendApiUrl } from "@/lib/backend-api";
import { fetchTokenSession } from "@/lib/auth-session";
import { uploadImage } from "@/components/shop-image";

type Blog = { id: string; title: string; slug: string; content: string; layout: string; published: boolean; updatedAt: string };
async function api(path: string, method = "GET", data?: unknown) {
  const session = await fetchTokenSession(); const token = session.tokens?.accessToken.toString();
  if (!token) throw new Error("Admin sign-in required.");
  const response = await fetch(backendApiUrl(path), { method, headers: { Authorization: `Bearer ${token}`, ...(data ? { "Content-Type": "application/json" } : {}) }, body: data ? JSON.stringify(data) : undefined, cache: "no-store" });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || "Blog request failed."); return result;
}
export default function AdminBlogs() {
  const [blogs, setBlogs] = useState<Blog[]>([]), [current, setCurrent] = useState<Blog | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const editor = useRef<HTMLDivElement>(null);
  async function refresh() { const result = await api("/admin/blogs"); setBlogs(result.blogs); }
  useEffect(() => { void refresh().catch(error => setMessage(error.message)); }, []);
  function create() { const blog = { id: crypto.randomUUID(), title: "", slug: "", content: "", layout: "stacked", published: false, updatedAt: "" }; setCurrent(blog); setMessage(""); setTimeout(() => { if (editor.current) editor.current.innerHTML = ""; }, 0); }
  function edit(blog: Blog) { setCurrent(blog); setMessage(""); setTimeout(() => { if (editor.current) editor.current.innerHTML = blog.content; }, 0); }
  async function save(published = current?.published ?? false) {
    if (!current) return; setBusy(true); setMessage("");
    try { const result = await api(`/admin/blogs/${current.id}`, "PUT", { title: current.title, content: editor.current?.innerHTML ?? "", layout: current.layout, published }); setCurrent(result.blog); await refresh(); setMessage(published ? "Blog published." : "Draft saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save blog."); } finally { setBusy(false); }
  }
  async function addImage(file?: File) { if (!file || !editor.current) return; setBusy(true); try { const source = await uploadImage(file, { kind: "images", name: "blog", entityId: current?.id }); document.execCommand("insertHTML", false, `<img src="${source}" alt="" style="max-width:100%;height:auto">`); } catch (error) { setMessage(error instanceof Error ? error.message : "Image upload failed."); } finally { setBusy(false); } }
  async function remove(blog: Blog) { if (!window.confirm(`Delete “${blog.title}”?`)) return; try { await api(`/admin/blogs/${blog.id}`, "DELETE"); setBlogs(value => value.filter(item => item.id !== blog.id)); if (current?.id === blog.id) setCurrent(null); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not delete blog."); } }
  if (!current) return <section className="admin-blogs"><div className="admin-blogs-heading"><p>Create and publish articles for your customers.</p><button type="button" onClick={create}>New blog</button></div>{message && <p role="status">{message}</p>}{blogs.length ? blogs.map(blog => <article className="admin-blog-row" key={blog.id}><div><strong>{blog.title || "Untitled blog"}</strong><small>{blog.published ? "Published" : "Draft"} · Updated {new Date(blog.updatedAt).toLocaleDateString()}</small></div><button type="button" onClick={() => edit(blog)}>Edit</button><button type="button" onClick={() => void remove(blog)}>Delete</button></article>) : <p>No blogs yet. Start with your first post.</p>}</section>;
  return <section className="admin-blogs admin-blog-editor"><button type="button" onClick={() => setCurrent(null)}>← All blogs</button><label>Title<input value={current.title} maxLength={180} onChange={event => setCurrent({ ...current, title: event.target.value })} placeholder="Give your blog a title" /></label><label>Article layout<select value={current.layout} onChange={event => setCurrent({ ...current, layout: event.target.value })}><option value="stacked">Text and images stacked</option><option value="image-left">Images on the left</option><option value="image-right">Images on the right</option></select></label><div className="rte-toolbar" aria-label="Text formatting"><button type="button" onClick={() => document.execCommand("bold")}>Bold</button><button type="button" onClick={() => document.execCommand("italic")}>Italic</button><button type="button" onClick={() => document.execCommand("formatBlock", false, "h2")}>Heading</button><button type="button" onClick={() => document.execCommand("insertUnorderedList")}>Bullets</button><button type="button" onClick={() => document.execCommand("justifyLeft")}>Align left</button><button type="button" onClick={() => document.execCommand("justifyCenter")}>Center</button><button type="button" onClick={() => document.execCommand("justifyRight")}>Align right</button><label className="rte-image-button">Add image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => void addImage(event.target.files?.[0])} /></label></div><div ref={editor} className="rte-editor" contentEditable suppressContentEditableWarning role="textbox" aria-label="Blog content" aria-multiline="true" data-placeholder="Write your blog here. Format text, align it, and add images." /><div className="admin-blog-actions"><button type="button" disabled={busy} onClick={() => void save(false)}>Save draft</button><button type="button" disabled={busy || !current.title.trim()} onClick={() => void save(true)}>Publish</button>{message && <span role="status">{message}</span>}</div></section>;
}
