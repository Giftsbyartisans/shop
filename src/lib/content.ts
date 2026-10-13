export type ShopContent = {
  personalizations: { id: string; name: string; heading: string; text: string; price?: number }[];
  defaultPersonalizationId: string;
  bestSellerIds: string[];
  favicon: string;
  saleEnabled: boolean;
  adminDesktopOnly: boolean;
  salePercent: number;
  banners: { id: string; image: string; alt: string }[];
  testimonialIntervalSeconds: number;
  reviews: { id: string; name: string; text: string; rating: number; dateReviewed?: string }[];
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
  personalizations: [],
  defaultPersonalizationId: "",
  bestSellerIds: [],
  favicon: "",
  saleEnabled: false,
  adminDesktopOnly: true,
  salePercent: 20,
  banners: [],
  reviews: [],
  testimonialIntervalSeconds: 5,
  contactText: "Have a question about a product or an order? Send us a message.",
  wholesaleText:
    "Interested in products for your store, team, or event? Tell us what you have in mind.",
  logo: "",
  logoAlt: "GiftsByArtisans",
  announcement: "Thoughtfully made. Beautifully crafted.",
  bannerTitle: "For the moments that matter.",
  bannerText:
    "Discover products with a personal touch. Find your favorite, then explore the possibilities of thoughtful giving.",
  footerText: "Made for thoughtful giving.",
  instagram: "",
  etsy: "",
  pinterest: "",
  contactEmail: "",
  phone: "",
  address: "",
  categories: [
    "Personalized products",
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
  if (!Array.isArray(content.personalizations)) throw new Error("Invalid personalization library.");
  const templateIds = new Set<string>();
  for (const template of content.personalizations) {
    if (!template || typeof template.id !== "string" || !template.id || templateIds.has(template.id) || typeof template.name !== "string" || !template.name.trim() || template.name.length > 100 || typeof template.heading !== "string" || template.heading.length > 150 || typeof template.text !== "string" || template.text.length > 2000) throw new Error("Each personalization needs a unique ID and a name, with a valid heading and instructions.");
    if (template.price !== undefined && (!Number.isFinite(template.price) || template.price < 0)) throw new Error("Personalization prices must be zero or greater.");
    templateIds.add(template.id);
  }
  if (content.defaultPersonalizationId && !templateIds.has(content.defaultPersonalizationId)) throw new Error("Select a default personalization from the library.");
  if (!Number.isInteger(content.testimonialIntervalSeconds) || content.testimonialIntervalSeconds < 0 || content.testimonialIntervalSeconds > 300)
    throw new Error("Testimonial interval must be a whole number from 0 to 300 seconds.");
  if (typeof content.adminDesktopOnly !== "boolean") throw new Error("Desktop-only admin setting must be a checkbox value.");
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
