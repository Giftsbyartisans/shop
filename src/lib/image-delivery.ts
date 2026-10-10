import outputs from '../../amplify_outputs.json';

export const IMAGE_WIDTHS = [320, 640, 960, 1600] as const;
const custom = (outputs as { custom?: { mediaCdnUrl?: string } }).custom;
export const mediaCdnUrl = (process.env.NEXT_PUBLIC_MEDIA_CDN_URL || custom?.mediaCdnUrl || '').replace(/\/$/, '');

export function cdnImageUrl(source: string, baseUrl = mediaCdnUrl): string | undefined {
  if (!baseUrl || !source.startsWith('s3:media/')) return undefined;
  return `${baseUrl}/${source.slice(3).split('/').map(encodeURIComponent).join('/')}`;
}

export function imageSrcSet(source: string, baseUrl = mediaCdnUrl): string | undefined {
  const url = cdnImageUrl(source, baseUrl);
  if (!url || !/\/1600\.webp$/.test(source)) return undefined;
  return IMAGE_WIDTHS.map(width => `${url.replace(/1600\.webp$/, `${width}.webp`)} ${width}w`).join(', ');
}

// Small standalone assets (such as favicons) do not need the largest variant.
export function cdnImageVariantUrl(source: string, width: number, baseUrl = mediaCdnUrl): string | undefined {
  const url = cdnImageUrl(source, baseUrl);
  if (!url || !/\/1600\.webp$/.test(source)) return url;
  const selected = IMAGE_WIDTHS.find(candidate => candidate >= width) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
  return url.replace(/1600\.webp$/, `${selected}.webp`);
}
