import type { APIGatewayProxyEventV2 } from "aws-lambda";
import process from "node:process";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, GetItemCommand, PutItemCommand, type AttributeValue } from "@aws-sdk/client-dynamodb";
import { downloadEtsyImage } from "../../../src/lib/download-etsy-image";
import { etsyUploadId, isEtsyImage } from "../../../src/lib/etsy-image-import";
import { mediaUploadPrefix } from "../../../src/lib/media-paths";
import { paypalSettingsSummary, updatePayPalSettings } from "../../../src/lib/paypal-settings";
import { calculateCartTotals } from "../../../src/lib/cart-totals";
import { defaultContent, type ShopContent } from "../../../src/lib/content";
import type { Listing } from "../../../src/lib/catalog";
import type { CartItem } from "../../../src/lib/shopping";
import { readPayPalSettings, writePayPalSettings } from "./paypal-storage";
import { placeOrder, OrderError, type OrderRecord } from "./orders";
import { defaultIcon } from "./default-icon";
const s3 = new S3Client({}), db = new DynamoDBClient({});
const verifier = CognitoJwtVerifier.create({ userPoolId: process.env.USER_POOL_ID!, clientId: process.env.USER_POOL_CLIENT_ID!, tokenUse: "access", groups: ["Admins"] });
const customerVerifier = CognitoJwtVerifier.create({ userPoolId: process.env.USER_POOL_ID!, clientId: process.env.USER_POOL_CLIENT_ID!, tokenUse: "access" });
const json = (body: unknown, statusCode = 200) => ({ statusCode, headers: { "content-type": "application/json", "cache-control": "no-store" }, body: JSON.stringify(body) });
function decode(value: AttributeValue): unknown {
  if (value.S !== undefined) return value.S;
  if (value.N !== undefined) return Number(value.N);
  if (value.BOOL !== undefined) return value.BOOL;
  if (value.L) return value.L.map(decode);
  if (value.M) return Object.fromEntries(Object.entries(value.M).map(([key, v]) => [key, decode(v)]));
  return null;
}
async function record(table: string | undefined, id: string) {
  const result = await db.send(new GetItemCommand({ TableName: table, Key: { id: { S: id } }, ConsistentRead: true }));
  return result.Item ? Object.fromEntries(Object.entries(result.Item).map(([key, value]) => [key, decode(value)])) : null;
}
function body(event: APIGatewayProxyEventV2, max = 8192) {
  const text = event.isBase64Encoded ? Buffer.from(event.body ?? "", "base64").toString("utf8") : event.body ?? "";
  if (text.length > max) throw new Error("Request is too large.");
  return JSON.parse(text);
}
export async function handler(event: APIGatewayProxyEventV2) {
  const path = event.rawPath, method = event.requestContext.http.method;
  if (path === "/favicon" && method === "GET") {
    try {
      const settings = await record(process.env.SHOP_SETTINGS_TABLE, "website");
      const content = typeof settings?.content === "string" ? JSON.parse(settings.content) : settings?.content;
      const source = event.queryStringParameters?.source ?? content?.favicon;
      if (typeof source === "string" && /^s3:media\/[a-zA-Z0-9/_ .-]+$/.test(source) && !source.split("/").some(part => part === "." || part === "..")) {
        const url = `${process.env.MEDIA_CDN_URL}/${source.slice(3).replace(/1600\.webp$/, "320.webp").split("/").map(encodeURIComponent).join("/")}`;
        const exists = await fetch(url, { method: "HEAD", redirect: "error", signal: AbortSignal.timeout(5000) });
        if (exists.ok && exists.headers.get("content-type")?.startsWith("image/")) return { statusCode: 302, headers: { location: url, "cache-control": "public, max-age=60" }, body: "" };
      }
    } catch { /* Retain a favicon if storage is unavailable. */ }
    return { statusCode: 200, isBase64Encoded: true, headers: { "content-type": "image/x-icon", "cache-control": "public, max-age=60" }, body: defaultIcon };
  }
  if ((path === "/cart" || path === "/cart/quote") && method === "POST") {
    try {
      const input = body(event, 128 * 1024);
      if (!Array.isArray(input.items) || input.items.length > 100) return json({ error: "A cart can contain up to 100 lines." }, 400);
      const items = input.items.map((entry: CartItem) => {
        if (!entry || typeof entry.id !== "string" || !entry.id || entry.id.length > 200 || !Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > 99 || (entry.personalization !== undefined && (typeof entry.personalization !== "string" || entry.personalization.length > 1024))) throw new Error("Invalid cart items.");
        return { id: entry.id, quantity: entry.quantity, personalization: entry.personalization };
      });
      const settings = await record(process.env.SHOP_SETTINGS_TABLE, "website");
      const raw = typeof settings?.content === "string" ? JSON.parse(settings.content) : settings?.content;
      const content = { ...defaultContent, ...raw } as ShopContent;
      const listings = (await Promise.all([...new Set<string>(items.map((item: CartItem) => item.id))].map(id => record(process.env.LISTING_TABLE, id)))).filter(Boolean) as unknown as Listing[];
      // Public Listing records are published by definition; only drafts carry the flag.
      return json(calculateCartTotals(items, listings.map(item => ({ ...item, published: true })), content));
    } catch (error) { return json({ error: error instanceof Error && !('$metadata' in error) ? error.message : "Cart prices could not be loaded." }, 400); }
  }
  if (path === "/orders" && method === "POST") {
    const token = event.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) return json({ error: "Sign in to place your order." }, 401);
    let customer;
    try { customer = await customerVerifier.verify(token); }
    catch { return json({ error: "Sign in to place your order." }, 401); }
    try {
      const receipt = await placeOrder(body(event, 128 * 1024), { sub: customer.sub, username: customer.username }, {
        getOrder: async id => await record(process.env.ORDER_TABLE, id) as OrderRecord | null,
        address: id => record(process.env.ADDRESS_TABLE, id),
        catalog: async ids => {
          const settings = await record(process.env.SHOP_SETTINGS_TABLE, "website");
          const raw = typeof settings?.content === "string" ? JSON.parse(settings.content) : settings?.content;
          const listings = (await Promise.all(ids.map(id => record(process.env.LISTING_TABLE, id)))).filter(Boolean) as unknown as Listing[];
          return { listings: listings.map(item => ({ ...item, published: true })), content: { ...defaultContent, ...raw } as ShopContent };
        },
        create: async order => {
          const Item = Object.fromEntries(Object.entries(order).map(([key, value]) => [key, typeof value === "number" ? { N: String(value) } : { S: value }]));
          try { await db.send(new PutItemCommand({ TableName: process.env.ORDER_TABLE, Item, ConditionExpression: "attribute_not_exists(id)" })); return true; }
          catch (error) { if (error instanceof Error && error.name === "ConditionalCheckFailedException") return false; throw error; }
        },
      });
      return json(receipt, 201);
    } catch (error) { return json({ error: error instanceof OrderError ? error.message : "Could not place your order. Please retry." }, error instanceof OrderError ? error.status : 503); }
  }
  if (!((path === "/admin/paypal" && (method === "GET" || method === "PUT")) || (path === "/import-image" && method === "POST"))) return json({ error: "Not found." }, 404);
  const token = event.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return json({ error: "Admin sign-in required." }, 401);
  try { await verifier.verify(token); } catch { return json({ error: "Admin sign-in required." }, 403); }
  if (path === "/admin/paypal") {
    try {
      const current = await readPayPalSettings();
      const environment = process.env.PAYPAL_MODE === "live" && event.headers["x-paypal-mode"] !== "sandbox" ? "live" : "sandbox";
      if (method === "GET") return json(paypalSettingsSummary(current, environment));
      let settings;
      try { settings = updatePayPalSettings(current, body(event)); }
      catch (error) { return json({ error: error instanceof Error ? error.message : "Invalid PayPal settings." }, 400); }
      await writePayPalSettings(settings);
      return json(paypalSettingsSummary(settings, environment));
    } catch { return json({ error: "PayPal storage is unavailable. Configure PAYPAL_ENCRYPTION_KEY on the Lambda backend." }, 503); }
  }
  try {
    const input = body(event, 4096);
    if (typeof input.url !== "string" || !isEtsyImage(input.url) || typeof input.listingId !== "string" || !input.listingId || input.listingId.length > 200) throw new Error("Enter an Etsy photo URL and listing ID.");
    const uploadId = await etsyUploadId(input.listingId, input.url);
    const prefix = mediaUploadPrefix({ kind: "listing-images", name: "etsy", entityId: input.listingId }, "etsy-photo", uploadId);
    const path = `${prefix}/1600.webp`;
    const existing = await fetch(`${process.env.MEDIA_CDN_URL}/${path}`, { method: "HEAD", signal: AbortSignal.timeout(5000), redirect: "error" }).catch(() => null);
    if (existing?.ok && existing.headers.get("content-type")?.startsWith("image/")) return json({ path: `s3:${path}` });
    const image = await downloadEtsyImage(input.url);
    const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
    const sourcePath = `${prefix}/source.${extension}`;
    await s3.send(new PutObjectCommand({ Bucket: process.env.MEDIA_BUCKET, Key: sourcePath, Body: new Uint8Array(await image.arrayBuffer()), ContentType: image.type }));
    return json({ sourceUrl: `${process.env.MEDIA_CDN_URL}/${sourcePath}` });
  } catch (error) { return json({ error: error instanceof Error && !('$metadata' in error) ? error.message : "Photo import failed." }, 400); }
}
