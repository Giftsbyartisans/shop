import { validateListingLinks, validateListingMedia, type Listing } from './catalog';
export const PUBLIC_CATALOG_PATH = 'media/published-listings.json';
export async function catalogWithNumbers(snapshot: Listing[] | undefined, fallback: () => Promise<Listing[]>): Promise<Listing[]> {
  if (snapshot?.every(item => item.publicId)) return snapshot;
  try { return await fallback(); }
  catch (cause) {
    // Older deployments have a valid catalog but no numbering API yet. Keep
    // serving those real products instead of failing or inventing public IDs.
    if (snapshot !== undefined) return snapshot;
    throw cause;
  }
}
export function parsePublicCatalog(value: unknown): Listing[] {
  if (!Array.isArray(value)) throw new Error('Invalid public catalog');
  return value.filter(item => !(typeof item?.image === "string" && item.image.startsWith("/demo/"))).map((item: Listing) => {
    if (!item || item.published !== true || typeof item.id !== 'string' || !item.id || typeof item.title !== 'string' || typeof item.description !== 'string' || typeof item.category !== 'string' || typeof item.image !== 'string' || !Number.isFinite(item.price) || item.price < 0) throw new Error('Invalid public listing');
    if (item.publicId !== undefined && (typeof item.publicId !== "string" || !/^[1-9]\d{5}$/.test(item.publicId))) throw new Error("Invalid public listing number");
    validateListingLinks(item);
    validateListingMedia(item);
    return item;
  });
}
