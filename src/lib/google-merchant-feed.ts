import type { Listing } from './catalog';
import { listingPrice } from './catalog';
import type { ShopContent } from './content';
import { cdnImageUrl } from './image-delivery';
import { listingPath } from './listing-url';

const xml = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const text = (value: string, limit: number) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
function imageLink(source: string, cdn: string) {
  const value = cdnImageUrl(source, cdn) ?? source;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : undefined; }
  catch { return undefined; }
}

export function buildGoogleMerchantFeed(origin: string, listings: Listing[], content: ShopContent, cdn: string) {
  const base = new URL(origin).origin;
  const products = [...new Map(listings.filter(item => item.published).map(item => [item.id, item])).values()];
  const items = products.map(item => {
    const title = text(item.title, 150), description = text(item.description, 5000);
    const image = imageLink(item.images?.[0] || item.image, cdn);
    const price = listingPrice(item, content.saleEnabled, content.salePercent);
    if (!title || !description || !image || !Number.isFinite(item.price) || item.price <= 0 || !Number.isFinite(price) || price <= 0 || price > item.price) {
      throw new Error(`Product ${item.id} needs a title, description, public HTTPS image, and positive price before export.`);
    }
    const extraImages = [...new Set((item.images ?? []).map(source => imageLink(source, cdn)).filter((value): value is string => Boolean(value) && value !== image))].slice(0, 10);
    return `<item>
<g:id>${xml(item.id)}</g:id>
<g:title>${xml(title)}</g:title>
<g:description>${xml(description)}</g:description>
<g:link>${xml(`${base}${listingPath(item)}`)}</g:link>
<g:image_link>${xml(image)}</g:image_link>
${extraImages.map(url => `<g:additional_image_link>${xml(url)}</g:additional_image_link>`).join('\n')}
<g:availability>${content.buyNowEnabled ? 'in_stock' : 'out_of_stock'}</g:availability>
<g:price>${item.price.toFixed(2)} USD</g:price>
${price < item.price ? `<g:sale_price>${price.toFixed(2)} USD</g:sale_price>` : ''}
<g:condition>new</g:condition>
<g:identifier_exists>no</g:identifier_exists>
${item.category ? `<g:product_type>${xml(item.category)}</g:product_type>` : ''}
</item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel><title>GiftsByArtisans products</title><link>${xml(base)}</link><description>Published GiftsByArtisans products</description>
${items}
</channel></rss>`;
}
