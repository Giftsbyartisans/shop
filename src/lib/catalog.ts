export type Listing = {
  id: string;
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
  images?: string[];
  videos?: string[];
};
export const demoListings: Listing[] = [
  {
    id: "personalized-keepsake",
    title: "Personalized keepsake gift box",
    category: "Personalized gifts",
    price: 32,
    image: "/demo/gift-0.svg",
    description:
      "A thoughtful little keepsake for a big moment. Add a name or a special message to make it their own.",
  },
  {
    id: "ceramic-vase",
    title: "Handcrafted ceramic vase",
    category: "Home & living",
    price: 48,
    image: "/demo/gift-1.svg",
    description:
      "Organic curves and a warm, natural finish. A lovely home for fresh stems or a beautiful piece all on its own.",
  },
  {
    id: "gold-necklace",
    title: "Everyday gold pendant necklace",
    category: "Jewelry",
    price: 29,
    image: "/demo/gift-2.svg",
    description:
      "A delicate pendant inspired by simple, everyday moments. A meaningful gift for someone close to your heart.",
  },
  {
    id: "celebration-box",
    title: "A little celebration gift set",
    category: "Special occasions",
    price: 45,
    image: "/demo/gift-3.svg",
    description:
      "Celebrate a birthday, a thank-you, or a new beginning with a carefully curated gift set.",
  },
  {
    id: "name-keepsake",
    title: "Custom name keepsake",
    category: "Personalized gifts",
    price: 24,
    image: "/demo/gift-0.svg",
    description:
      "A personal touch they can treasure. A charming keepsake to mark a special memory.",
  },
  {
    id: "bud-vase",
    title: "Minimal ceramic bud vase",
    category: "Home & living",
    price: 26,
    image: "/demo/gift-1.svg",
    description:
      "A small handcrafted accent for a bedside table, a favorite shelf, or a thoughtful housewarming gift.",
  },
].map((item) => ({ ...item, published: true }));
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
  return saleEnabled
    ? (item.salePrice ?? item.price * (1 - salePercent / 100))
    : item.price;
}
export function validateListingMedia(item: Listing) {
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
    if (value.startsWith("s3:media/") || value.startsWith("/demo/")) continue;
    try {
      if (new URL(value).protocol !== "https:") throw new Error();
    } catch {
      throw new Error("Media must use an HTTPS URL or an uploaded file.");
    }
  }
}
