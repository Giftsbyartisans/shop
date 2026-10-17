export type Listing = {
  id: string;
  publicId?: string;
  title: string;
  description: string;
  image: string;
  price: number;
  category: string;
  published: boolean;
  createdAt?: string;
  etsyUrl?: string;
  pinterestUrl?: string;
  salePrice?: number;
  personalizationEnabled?: boolean;
  personalizationMode?: "default" | "template" | "custom" | "none";
  personalizationTemplateId?: string;
  personalizationHeading?: string;
  personalizationText?: string;
  personalizationPrice?: number;
  images?: string[];
  videos?: string[];
};
export const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    price,
  );

export function validateListingLinks(
  item: Pick<Listing, "etsyUrl" | "pinterestUrl">,
) {
  for (const [label, value, domain] of [
    ["Etsy", item.etsyUrl, "etsy.com"],
    ["Pinterest", item.pinterestUrl, "pinterest.com"],
  ] as const) {
    if (!value?.trim()) continue;
    try {
      const url = new URL(value.trim());
      if (
        url.protocol !== "https:" ||
        !(url.hostname === domain || url.hostname.endsWith("." + domain))
      )
        throw new Error();
    } catch {
      throw new Error(`Use an HTTPS ${label} URL.`);
    }
  }
}

export function listingPrice(
  item: Listing,
  saleEnabled: boolean,
  salePercent: number,
) {
  return item.salePrice ?? (saleEnabled
    ? item.price * (1 - salePercent / 100)
    : item.price);
}
export function validateListingMedia(item: Listing) {
  if (item.personalizationMode && !["default", "template", "custom", "none"].includes(item.personalizationMode)) throw new Error("Choose a valid personalization option.");
  if (item.personalizationMode === "template" && !item.personalizationTemplateId) throw new Error("Select a personalization template.");
  if (item.personalizationPrice !== undefined && (!Number.isFinite(item.personalizationPrice) || item.personalizationPrice < 0)) throw new Error("Personalization price must be zero or greater.");
  if ((item.personalizationHeading?.length ?? 0) > 150 || (item.personalizationText?.length ?? 0) > 2000) throw new Error("Personalization heading or instructions are too long.");
  if (
    item.salePrice !== undefined &&
    (!Number.isFinite(item.salePrice) ||
      item.salePrice < 0 ||
      item.salePrice > item.price)
  )
    throw new Error("Sale price must be between zero and the regular price.");
  if ((item.images?.length ?? 0) > 10 || (item.videos?.length ?? 0) > 2)
    throw new Error("Use up to 10 photos and 2 videos.");
  for (const value of [
    item.image,
    ...(item.images ?? []),
    ...(item.videos ?? []),
  ]) {
    if (!value && !item.published) continue;
    if (value.startsWith("s3:media/")) continue;
    try {
      if (new URL(value).protocol !== "https:") throw new Error();
    } catch {
      throw new Error("Media must use an HTTPS URL or an uploaded file.");
    }
  }
}
