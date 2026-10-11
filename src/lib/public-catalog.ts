import { validateListingLinks, validateListingMedia, type Listing } from './catalog';
export const PUBLIC_CATALOG_PATH = 'media/published-listings.json';
export function parsePublicCatalog(value: unknown): Listing[] {
  if (!Array.isArray(value)) throw new Error('Invalid public catalog');
  return value.map((item: Listing) => {
    if (!item || item.published !== true || typeof item.id !== 'string' || !item.id || typeof item.title !== 'string' || typeof item.description !== 'string' || typeof item.category !== 'string' || typeof item.image !== 'string' || !Number.isFinite(item.price) || item.price < 0) throw new Error('Invalid public listing');
    validateListingLinks(item);
    validateListingMedia(item);
    return item;
  });
}
