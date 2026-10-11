export type MediaUploadContext = {
  kind: 'banners' | 'categories' | 'logos' | 'favicons' | 'listing-images' | 'listing-videos' | 'images';
  name: string;
  entityId?: string;
};
export function mediaSlug(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70).replace(/-$/, '') || 'untitled';
}
export function mediaUploadPrefix(context: MediaUploadContext, filename: string, uploadId: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uploadId)) throw new Error('Invalid upload ID');
  const owner = mediaSlug(context.name) + (context.entityId ? `-${mediaSlug(context.entityId)}` : '');
  return `media/${context.kind}/${owner}/${mediaSlug(filename.replace(/\.[^.]+$/, ''))}--${uploadId}`;
}

const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const legacyFolder = new RegExp(`^media/${uuid}/`, 'i');
const namedFolder = new RegExp(`^media/(?:banners|categories|logos|favicons|listing-images|listing-videos|images)/[a-z0-9-]+/[a-z0-9-]+--${uuid}/`, 'i');
// Return only a single upload folder, never the entire listing/category folder.
export function mediaAssetKey(path: string): string {
  return path.match(legacyFolder)?.[0] ?? path.match(namedFolder)?.[0] ?? path;
}
