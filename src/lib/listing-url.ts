import type { Listing } from './catalog';

type Product = Pick<Listing, 'id' | 'title' | 'publicId'>;
export function titleSlug(title: string) {
  return title.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'product';
}

// Public catalog links use the persistent six-digit listing number. Historical
// order snapshots without that number can still open the product by its UUID.
export function listingSlug(item: Product) {
  return `${titleSlug(item.title)}-${item.publicId ?? item.id}`;
}

export function listingPath(item: Product) {
  return `/listing/${encodeURIComponent(listingSlug(item))}`;
}

export function resolveListing(value: string, catalog: readonly Listing[]) {
  const published = catalog.filter(item => item.published);
  return published.find(item => listingSlug(item) === value)
    ?? published.find(item => `${titleSlug(item.title)}-${item.id}` === value);
}
