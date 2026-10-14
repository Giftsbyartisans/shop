import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const listingFields = () => ({
  title: a.string().required(),
  description: a.string().required(),
  image: a.string().required(),
  price: a.float().required(),
  category: a.string().required(),
  etsyUrl: a.string(),
  pinterestUrl: a.string(),
  salePrice: a.float(),
  personalizationEnabled: a.boolean(),
  personalizationMode: a.enum(["default", "template", "custom", "none"]),
  personalizationTemplateId: a.string(),
  personalizationHeading: a.string(),
  personalizationText: a.string(),
  personalizationPrice: a.float(),
  images: a.string().array(),
  videos: a.string().array(),
});
const schema = a.schema({
  PaymentSettings: a.model({ encryptedContent: a.string().required() })
    .authorization(allow => [allow.groups(["Admins"])]),
  CustomerCart: a.model({ items: a.json().required() })
    .authorization(allow => [allow.owner()]),
  CustomerFavorite: a.model({ listingId: a.string().required() })
    .authorization(allow => [allow.owner()]),
  CustomerPreferences: a.model({
    defaultAddressId: a.string(),
  }).authorization(allow => [allow.owner()]),
  ShippingAddress: a.model({
    label: a.string(),
    recipient: a.string().required(),
    line1: a.string().required(),
    line2: a.string(),
    city: a.string().required(),
    region: a.string(),
    postalCode: a.string().required(),
    country: a.string().required(),
    phone: a.string().required(),
    email: a.email(),
  }).authorization(allow => [allow.owner()]),
  CustomerOrder: a.model({
    owner: a.string().required(),
    orderNumber: a.string().required(),
    status: a.enum(["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"]),
    total: a.float().required(),
    currency: a.string().required(),
    items: a.json().required(),
    trackingUrl: a.url(),
    shippingAddress: a.json(),
    subtotal: a.float(),
    discount: a.float(),
    shipping: a.float(),
    requestFingerprint: a.string(),
    isSample: a.boolean(),
    email: a.email(),
    trackingNumber: a.string(),
  }).authorization(allow => [
    allow.groups(["Admins"]),
  ]).secondaryIndexes(index => [index("trackingNumber").name("byTrackingNumber"), index("email").name("byEmail")]),
  ShopSettings: a
    .model({ content: a.json().required() })
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      allow.groups(["Admins"]),
    ]),
  DraftListing: a
    .model({ ...listingFields(), published: a.boolean().required() })
    .authorization((allow) => [allow.groups(["Admins"])]),
  Listing: a
    .model(listingFields())
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      allow.groups(["Admins"]),
    ]),
  Inquiry: a
    .model({
      kind: a.enum(["contact", "wholesale"]),
      name: a.string().required(),
      email: a.email().required(),
      message: a.string().required(),
      business: a.string(),
      quantity: a.integer(),
      readAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.guest().to(["create"]),
      allow.authenticated().to(["create"]),
      allow.groups(["Admins"]).to(["read", "update", "delete"]),
    ]),
});
export type Schema = ClientSchema<typeof schema>;
export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: "userPool" },
});
