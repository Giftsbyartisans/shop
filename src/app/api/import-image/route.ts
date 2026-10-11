import { CognitoJwtVerifier } from 'aws-jwt-verify';
import outputs from '../../../../amplify_outputs.json';
import { downloadEtsyImage } from '@/lib/download-etsy-image';

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
    const { url } = JSON.parse(body);
    if (typeof url !== 'string') throw new Error('Photo URL is required.');
    const image = await downloadEtsyImage(url);
    return new Response(image, { headers: { 'Content-Type': image.type, 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Photo download failed.' }, { status: 400 });
  }
}
