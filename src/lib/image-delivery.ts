import outputs from '../../amplify_outputs.json';

export const IMAGE_WIDTHS = [320, 640, 960, 1600] as const;
const custom = (outputs as { custom?: { mediaCdnUrl?: string } }).custom;
export const mediaCdnUrl = custom?.mediaCdnUrl?.replace(/\/$/, '') ?? '';

export function cdnImageUrl(source: string, baseUrl = mediaCdnUrl): string | undefined {
  if (!baseUrl || !source.startsWith('s3:media/')) return undefined;
  return `${baseUrl}/${source.slice(3).split('/').map(encodeURIComponent).join('/')}`;
}

export function imageSrcSet(source: string, baseUrl = mediaCdnUrl): string | undefined {
  const url = cdnImageUrl(source, baseUrl);
  if (!url || !/\/1600\.webp$/.test(source)) return undefined;
  return IMAGE_WIDTHS.map(width => `${url.replace(/1600\.webp$/, `${width}.webp`)} ${width}w`).join(', ');
}
