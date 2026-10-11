import { CognitoJwtVerifier } from 'aws-jwt-verify';
import outputs from '../../../../amplify_outputs.json';
import { downloadEtsyImage } from '@/lib/download-etsy-image';
import { etsyUploadId, isEtsyImage } from '@/lib/etsy-image-import';
import { mediaUploadPrefix } from '@/lib/media-paths';
import { mediaCdnUrl } from '@/lib/image-delivery';

const verifier = CognitoJwtVerifier.create({ userPoolId: outputs.auth.user_pool_id,
  clientId: outputs.auth.user_pool_client_id, tokenUse: 'access', groups: ['Admins'] });
export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return Response.json({ error: 'Admin sign-in required.' }, { status: 401 });
  try { await verifier.verify(token); }
  catch { return Response.json({ error: 'Admin sign-in required.' }, { status: 403 }); }
  try {
    const body = await request.text();
    if (body.length > 4096) throw new Error('Image request is too large.');
    const { url, listingId } = JSON.parse(body);
    if (typeof url !== 'string') throw new Error('Photo URL is required.');
    if (typeof listingId === 'string' && listingId.length <= 200 && isEtsyImage(url) && mediaCdnUrl) {
      const uploadId = await etsyUploadId(listingId, url);
      const path = `${mediaUploadPrefix({ kind: 'listing-images', name: 'etsy', entityId: listingId }, 'etsy-photo', uploadId)}/1600.webp`;
      try {
        const existing = await fetch(`${mediaCdnUrl}/${path.split('/').map(encodeURIComponent).join('/')}`, {
          method: 'HEAD', signal: AbortSignal.timeout(10000), cache: 'no-store', redirect: 'error',
        });
        if (existing.ok && existing.headers.get('content-type')?.startsWith('image/')) {
          return Response.json({ path: `s3:${path}` });
        }
      } catch { /* If the CDN check fails, download and upload the source as usual. */ }
    }
    const image = await downloadEtsyImage(url);
    return new Response(image, { headers: { 'Content-Type': image.type, 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Photo download failed.' }, { status: 400 });
  }
}
