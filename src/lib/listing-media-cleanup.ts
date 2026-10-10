// UUID folders are created exclusively for one uploaded image and its variants.
const imageFolder = /^media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i;

function mediaPath(value: string): string | undefined {
  if (!value.startsWith('s3:media/')) return undefined;
  const path = value.slice(3);
  if (path.includes('..') || !/^media\/[a-zA-Z0-9_\-./]+$/.test(path)) return undefined;
  return path;
}
function assetKey(path: string): string {
  return path.match(imageFolder)?.[0] ?? path;
}
export function mediaReferences(value: unknown): string[] {
  if (typeof value === 'string') {
    const path = mediaPath(value);
    return path ? [path] : [];
  }
  if (Array.isArray(value)) return value.flatMap(mediaReferences);
  if (value && typeof value === 'object') return Object.values(value).flatMap(mediaReferences);
  return [];
}

export async function cleanupListingMedia(
  listingRecords: unknown,
  retainedRecords: unknown,
  storage: {
    list: (prefix: string) => Promise<string[]>;
    remove: (path: string) => Promise<unknown>;
  },
) {
  const protectedAssets = new Set(mediaReferences(retainedRecords).map(assetKey));
  const assets = new Set(mediaReferences(listingRecords).map(assetKey));
  // Finish discovering paths before deleting any objects.
  const paths = new Set<string>();
  for (const asset of assets) {
    if (protectedAssets.has(asset)) continue;
    if (asset.endsWith('/')) {
      for (const path of await storage.list(asset)) {
        if (path.startsWith(asset)) paths.add(path);
      }
    } else paths.add(asset);
  }
  // Stop on failure; listing records remain available for retry.
  for (const path of paths) await storage.remove(path);
}
