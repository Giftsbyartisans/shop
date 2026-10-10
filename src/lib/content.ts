export type ShopContent = {
  bestSellerIds: string[];
  favicon: string;
  saleEnabled: boolean;
  salePercent: number;
  banners: { id: string; image: string; alt: string }[];
  reviews: { id: string; name: string; text: string; rating: number }[];
  contactText: string;
  wholesaleText: string;
  logo: string;
  logoAlt: string;
  announcement: string;
  bannerTitle: string;
  bannerText: string;
  footerText: string;
  instagram: string;
  etsy: string;
  pinterest: string;
  contactEmail: string;
  phone: string;
  address: string;
  categories: { id: string; name: string; image: string }[];
  policies: { id: string; title: string; text: string }[];
};
export const defaultContent: ShopContent = {
  bestSellerIds: [],
  favicon: "",
  saleEnabled: false,
  salePercent: 20,
  banners: [],
  reviews: [],
  contactText: "Have a question about a gift or an order? Send us a message.",
  wholesaleText:
    "Interested in gifts for your store, team, or event? Tell us what you have in mind.",
  logo: "",
  logoAlt: "GiftsByArtisans",
  announcement: "A little thought. A meaningful gift.",
  bannerTitle: "For the moments that matter.",
  bannerText:
    "Discover gifts with a personal touch. Find your favorite, then explore the possibilities of thoughtful giving.",
  footerText: "Made for thoughtful giving.",
  instagram: "",
  etsy: "",
  pinterest: "",
  contactEmail: "",
  phone: "",
  address: "",
  categories: [
    "Personalized gifts",
    "Home & living",
    "Jewelry",
    "Special occasions",
  ].map((name, i) => ({ id: String(i), name, image: `/demo/gift-${i}.svg` })),
  policies: [
    {
      id: "ordering",
      title: "Ordering & personalization",
      text: "Contact us about availability, ordering, and personalization before purchasing.",
    },
    {
      id: "delivery",
      title: "Shipping & delivery",
      text: "Delivery times and shipping costs depend on the product and destination. Check the seller’s listing before placing an order.",
    },
    {
      id: "returns",
      title: "Returns & exchanges",
      text: "Please check the seller’s return policy before purchasing, particularly for custom and personalized items.",
    },
    {
      id: "privacy",
      title: "Your privacy",
      text: "Inquiry details are stored securely in our backend and are available to authorized shop administrators so they can respond to your request. Contact us with questions about your information.",
    },
  ],
};

export function validateContent(content: ShopContent) {
  if (
    !Number.isFinite(content.salePercent) ||
    content.salePercent < 0 ||
    content.salePercent > 99
  )
    throw new Error("Discount must be between 0 and 99%.");
  if (content.categories.some((c) => !c.name.trim()))
    throw new Error("Every category needs a name.");
  if (
    content.reviews.some(
      (r) =>
        !r.name.trim() ||
        !r.text.trim() ||
        !Number.isInteger(r.rating) ||
        r.rating < 1 ||
        r.rating > 5,
    )
  )
    throw new Error(
      "Every testimonial needs a name, text, and a rating from 1 to 5.",
    );
  if (content.policies.some((p) => !p.title.trim()))
    throw new Error("Every policy needs a heading.");
  const images = [
    content.logo,
    content.favicon,
    ...content.banners.map((b) => b.image),
    ...content.categories.map((c) => c.image),
  ];
  for (const value of images)
    if (
      value &&
      !value.startsWith("s3:media/") &&
      !value.startsWith("/demo/")
    ) {
      try {
        if (new URL(value).protocol !== "https:") throw new Error();
      } catch {
        throw new Error("Images must use HTTPS URLs or uploaded files.");
      }
    }
  for (const value of [content.instagram, content.etsy, content.pinterest])
    if (value) {
      try {
        if (new URL(value).protocol !== "https:") throw new Error();
      } catch {
        throw new Error("Social links must use HTTPS URLs.");
      }
    }
}
