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
  images: a.string().array(),
  videos: a.string().array(),
});
const schema = a.schema({
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
    })
    .authorization((allow) => [
      allow.guest().to(["create"]),
      allow.authenticated().to(["create"]),
      allow.groups(["Admins"]).to(["read", "delete"]),
    ]),
});
export type Schema = ClientSchema<typeof schema>;
export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: "userPool" },
});
