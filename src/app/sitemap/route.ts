export function GET() {
  // Resolve against the browser's public origin, not the proxy's internal URL.
  return new Response(null, {
    status: 307,
    headers: { Location: "/sitemap.xml", "Cache-Control": "no-store" },
  });
}
