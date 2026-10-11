import sharp from 'sharp';
import { loadPublicShopContent } from '@/lib/server-shop-content';
import { cdnImageVariantUrl } from '@/lib/image-delivery';

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get('source');
  const source = requested ?? (await loadPublicShopContent())?.favicon ?? '';
  const safe = /^s3:media\/[a-zA-Z0-9/_ .-]+$/.test(source) &&
    !source.slice(3).split('/').some(part => part === '.' || part === '..');
  const url = safe ? cdnImageVariantUrl(source, 320) : undefined;
  if (url) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: 'error' });
      if (!response.ok || !response.body) throw new Error('Favicon unavailable');
      const chunks: Uint8Array[] = [];
      const reader = response.body.getReader();
      let length = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > 8 * 1024 * 1024) throw new Error('Favicon too large');
          chunks.push(value);
        }
      } finally { await reader.cancel(); }
      const png = await sharp(Buffer.concat(chunks), { limitInputPixels: 40_000_000 })
        .rotate().resize(48, 48, { fit: 'contain', background: '#00000000' }).png().toBuffer();
      return new Response(new Uint8Array(png), { headers: {
        'Content-Type': 'image/png', 'Cache-Control': requested ? 'public, max-age=86400' : 'public, max-age=60',
      } });
    } catch { /* Use the bundled icon when settings or storage are unavailable. */ }
  }
  return Response.redirect(new URL('/favicon.ico', request.url), 302);
}
