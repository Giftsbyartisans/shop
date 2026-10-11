import { isEtsyImage } from './etsy-image-import';
const MAX_BYTES = 8 * 1024 * 1024;
export async function downloadEtsyImage(source: string, fetchImage: typeof fetch = fetch): Promise<Blob> {
  if (!isEtsyImage(source)) throw new Error('Only HTTPS Etsy photo URLs are supported.');
  const response = await fetchImage(source, { redirect: 'error', signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!response.ok || !response.body) throw new Error('Etsy photo could not be downloaded.');
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Etsy photo exceeds 8 MB.');
  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error('Etsy photo exceeds 8 MB.');
      chunks.push(new Uint8Array(value));
    }
  } finally { await reader.cancel(); }
  const blob = new Blob(chunks);
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  const type = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg'
    : bytes[0] === 137 && text.slice(1, 4) === 'PNG' ? 'image/png'
    : text.startsWith('RIFF') && text.slice(8,12) === 'WEBP' ? 'image/webp' : '';
  if (!type) throw new Error('Etsy photo must be JPEG, PNG, or WebP.');
  return new Blob(chunks, { type });
}
