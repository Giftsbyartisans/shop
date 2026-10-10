import { defaultContent, validateContent, type ShopContent } from "./content";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { fetchAuthSession } from "aws-amplify/auth";
import { list, remove } from "aws-amplify/storage";
import { cleanupListingMedia } from "./listing-media-cleanup";
import outputs from "../../amplify_outputs.json";
import type { Schema } from "../../amplify/data/resource";
import {
  validateListingLinks,
  validateListingMedia,
  type Listing,
} from "./catalog";

Amplify.configure(outputs);
const client = generateClient<Schema>();
const adminAuth = { authMode: "userPool" as const };
function check(result: { errors?: readonly { message: string }[] }) {
  if (result.errors?.length)
    throw new Error(result.errors.map((e) => e.message).join("; "));
}
export async function isAdmin() {
  const session = await fetchAuthSession();
  const groups = session.tokens?.accessToken.payload["cognito:groups"];
  return Array.isArray(groups) && groups.includes("Admins");
}
export async function listListings(admin = false): Promise<Listing[]> {
  const authMode: "userPool" | "identityPool" =
    admin || (await fetchAuthSession()).tokens ? "userPool" : "identityPool";
  const items: Listing[] = [];
  let nextToken: string | null | undefined;
  do {
    const options = { authMode, limit: 100, nextToken };
    const result = admin
      ? await client.models.DraftListing.list(options)
      : await client.models.Listing.list(options);
    check(result);
    items.push(
      ...result.data.map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        title: item.title,
        description: item.description,
        image: item.image,
        price: item.price,
        category: item.category,
        etsyUrl: item.etsyUrl ?? "",
        pinterestUrl: item.pinterestUrl ?? "",
        salePrice: item.salePrice ?? undefined,
        images: item.images?.filter((value): value is string =>
          Boolean(value),
        ) ?? [item.image],
        videos:
          item.videos?.filter((value): value is string => Boolean(value)) ?? [],
        published: "published" in item ? Boolean(item.published) : true,
      })),
    );
    nextToken = result.nextToken;
  } while (nextToken);
  return items;
}
export async function saveListing(item: Listing) {
  validateListingLinks(item);
  validateListingMedia(item);
  if (
    !item.title.trim() ||
    !item.description.trim() ||
    !Number.isFinite(item.price) ||
    item.price < 0
  ) {
    throw new Error(
      "Enter a title, description, and a valid nonnegative price.",
    );
  }
  const { id, title, description, image, price, category, published } = item;
  const publicItem = {
    id,
    title,
    description,
    image,
    price,
    category,
    etsyUrl: item.etsyUrl?.trim() || null,
    pinterestUrl: item.pinterestUrl?.trim() || null,
    salePrice: item.salePrice ?? null,
    images: item.images ?? [item.image],
    videos: item.videos ?? [],
  };
  const draftItem = { ...publicItem, published };
  // Remove public visibility before changing an item to a draft.
  const existingPublic = await client.models.Listing.get(
    { id: item.id },
    adminAuth,
  );
  check(existingPublic);
  if (!published && existingPublic.data)
    check(await client.models.Listing.delete({ id: item.id }, adminAuth));
  const existingDraft = await client.models.DraftListing.get(
    { id: item.id },
    adminAuth,
  );
  check(existingDraft);
  if (existingDraft.data)
    check(await client.models.DraftListing.update(draftItem, adminAuth));
  else check(await client.models.DraftListing.create(draftItem, adminAuth));
  if (published) {
    if (existingPublic.data)
      check(await client.models.Listing.update(publicItem, adminAuth));
    else check(await client.models.Listing.create(publicItem, adminAuth));
  }
}
export async function deleteListing(id: string) {
  const results = await Promise.all([
    client.models.Listing.get({ id }, adminAuth),
    client.models.DraftListing.get({ id }, adminAuth),
    listListings(true),
    listListings(false),
    loadShopContent(),
  ]);
  const [publicRecord, draftRecord, drafts, published, content] = results;
  check(publicRecord);
  check(draftRecord);
  if (!publicRecord.data && !draftRecord.data) return;
  try {
    await cleanupListingMedia(
      [publicRecord.data, draftRecord.data],
      [drafts.filter(item => item.id !== id), published.filter(item => item.id !== id), content],
      {
        list: async prefix => {
          const result = await list({ path: prefix, options: { listAll: true } });
          return result.items.map(item => item.path);
        },
        remove: async path => { await remove({ path }); },
      },
    );
  } catch {
    throw new Error("Media cleanup failed. The listing records were kept so you can retry deletion. Some files may already have been removed.");
  }
  if (publicRecord.data) check(await client.models.Listing.delete({ id }, adminAuth));
  if (draftRecord.data) check(await client.models.DraftListing.delete({ id }, adminAuth));
}

export type Inquiry = {
  id: string;
  kind: string | null;
  name: string;
  email: string;
  message: string;
  business?: string | null;
  quantity?: number | null;
  createdAt: string;
};
export async function listInquiries() {
  const items: Inquiry[] = [];
  let nextToken: string | null | undefined;
  do {
    const result = await client.models.Inquiry.list({
      ...adminAuth,
      limit: 100,
      nextToken,
    });
    check(result);
    items.push(...result.data);
    nextToken = result.nextToken;
  } while (nextToken);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function submitInquiry(input: {
  kind: "contact" | "wholesale";
  name: string;
  email: string;
  message: string;
  business?: string;
  quantity?: number;
}) {
  const authMode = (await fetchAuthSession()).tokens
    ? "userPool"
    : "identityPool";
  check(await client.models.Inquiry.create(input, { authMode }));
}

export async function loadShopContent() {
  const authMode = (await fetchAuthSession()).tokens
    ? "userPool"
    : "identityPool";
  const result = await client.models.ShopSettings.get(
    { id: "website" },
    { authMode },
  );
  check(result);
  if (!result.data) return structuredClone(defaultContent);
  const raw =
    typeof result.data.content === "string"
      ? JSON.parse(result.data.content)
      : result.data.content;
  const content = { ...structuredClone(defaultContent), ...raw } as ShopContent;
  validateContent(content);
  return content;
}
export async function saveShopContent(content: ShopContent) {
  validateContent(content);
  const existing = await client.models.ShopSettings.get(
    { id: "website" },
    adminAuth,
  );
  check(existing);
  const input = { id: "website", content: JSON.stringify(content) };
  if (existing.data)
    check(await client.models.ShopSettings.update(input, adminAuth));
  else check(await client.models.ShopSettings.create(input, adminAuth));
}
export async function deleteInquiry(id: string) {
  check(await client.models.Inquiry.delete({ id }, adminAuth));
}
