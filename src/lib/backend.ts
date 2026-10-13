import { categoryRenames } from "./category-renames";
import { defaultContent, validateContent, type ShopContent } from "./content";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { fetchAuthSession } from "aws-amplify/auth";
import { list, remove, uploadData } from "aws-amplify/storage";
import { PUBLIC_CATALOG_PATH } from "./public-catalog";
import { PUBLIC_SETTINGS_PATH } from "./public-shop-content";
import { cleanupListingMedia, mediaReferences } from "./listing-media-cleanup";
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
        personalizationEnabled: item.personalizationEnabled ?? false,
        personalizationMode: item.personalizationMode ?? undefined,
        personalizationTemplateId: item.personalizationTemplateId ?? undefined,
        personalizationHeading: item.personalizationHeading ?? "",
        personalizationText: item.personalizationText ?? "",
        personalizationPrice: item.personalizationPrice ?? undefined,
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
async function publishPublicCatalog() {
  const listings = await listListings();
  await uploadData({ path: PUBLIC_CATALOG_PATH, data: JSON.stringify(listings.filter(item => item.published)), options: {
    contentType: "application/json", cacheControl: "public, max-age=0, s-maxage=30, must-revalidate",
  } }).result;
}
async function refreshPublicCatalog() {
  try { await publishPublicCatalog(); }
  catch { throw new Error("Listing changes were saved, but the fast-loading catalog could not be published. Save website settings to retry."); }
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
    personalizationEnabled: item.personalizationEnabled ?? false,
    personalizationMode: item.personalizationMode ?? null,
    personalizationTemplateId: item.personalizationTemplateId ?? null,
    personalizationHeading: item.personalizationHeading?.trim() || null,
    personalizationText: item.personalizationText?.trim() || null,
    personalizationPrice: item.personalizationPrice ?? null,
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
  const existingDraft = await client.models.DraftListing.get(
    { id: item.id },
    adminAuth,
  );
  check(existingDraft);
  const currentMedia = new Set(mediaReferences(item));
  const removedMedia = mediaReferences([existingPublic.data, existingDraft.data])
    .filter(path => !currentMedia.has(path)).map(path => `s3:${path}`);
  if (removedMedia.length) {
    const [drafts, publicListings, content] = await Promise.all([
      listListings(true), listListings(false), loadShopContent(),
    ]);
    try {
      await cleanupListingMedia(removedMedia, [item, content,
        drafts.filter(listing => listing.id !== id),
        publicListings.filter(listing => listing.id !== id)], {
        list: async prefix => {
          const result = await list({ path: prefix, options: { listAll: true } });
          return result.items.map(asset => asset.path);
        },
        remove: async path => { await remove({ path }); },
      });
    } catch {
      throw new Error("Media cleanup failed. Listing records were kept so you can save again to retry. Some files may already have been removed.");
    }
  }
  if (!published && existingPublic.data)
    check(await client.models.Listing.delete({ id: item.id }, adminAuth));
  if (existingDraft.data)
    check(await client.models.DraftListing.update(draftItem, adminAuth));
  else check(await client.models.DraftListing.create(draftItem, adminAuth));
  if (published) {
    if (existingPublic.data)
      check(await client.models.Listing.update(publicItem, adminAuth));
    else check(await client.models.Listing.create(publicItem, adminAuth));
  }
  await refreshPublicCatalog();
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
  await refreshPublicCatalog();
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
  readAt?: string | null;
};
export async function markInquiryRead(id: string) {
  const readAt = new Date().toISOString();
  check(await client.models.Inquiry.update({ id, readAt }, adminAuth));
  return readAt;
}
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
  if (existing.data) {
    const raw = typeof existing.data.content === "string"
      ? JSON.parse(existing.data.content) : existing.data.content;
    const previous = { ...structuredClone(defaultContent), ...raw } as ShopContent;
    const renames = categoryRenames(previous.categories, content.categories);
    const currentImages = new Set(mediaReferences(content));
    const removedImages = mediaReferences(previous)
      .filter(path => !currentImages.has(path)).map(path => `s3:${path}`);
    if (removedImages.length) {
      const [drafts, published] = await Promise.all([listListings(true), listListings()]);
      try {
        await cleanupListingMedia(removedImages, [content, drafts, published], {
          list: async prefix => {
            const result = await list({ path: prefix, options: { listAll: true } });
            return result.items.map(item => item.path);
          },
          remove: async path => { await remove({ path }); },
        });
      } catch {
        throw new Error("Image cleanup failed. Website settings were kept so you can save again to retry. Some files may already have been removed.");
      }
    }
    if (renames.size) {
      const [drafts, published] = await Promise.all([listListings(true), listListings(false)]);
      for (const listing of drafts) {
        const category = renames.get(listing.category);
        if (category) check(await client.models.DraftListing.update({ id: listing.id, category }, adminAuth));
      }
      for (const listing of published) {
        const category = renames.get(listing.category);
        if (category) check(await client.models.Listing.update({ id: listing.id, category }, adminAuth));
      }
    }
  }
  const input = { id: "website", content: JSON.stringify(content) };
  if (existing.data)
    check(await client.models.ShopSettings.update(input, adminAuth));
  else check(await client.models.ShopSettings.create(input, adminAuth));
  try {
    await uploadData({
      path: PUBLIC_SETTINGS_PATH,
      data: JSON.stringify(content),
      options: { contentType: "application/json", cacheControl: "public, max-age=0, s-maxage=30, must-revalidate" },
    }).result;
    await publishPublicCatalog();
  } catch {
    throw new Error("Settings saved, but the fast-loading website snapshot could not be published. Save again to retry.");
  }
}
export async function deleteInquiry(id: string) {
  check(await client.models.Inquiry.delete({ id }, adminAuth));
}
