import { paypalClient, captureReceipt } from "./paypal-checkout";
import { orderUpdate } from "../../../src/lib/admin-orders";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { checkoutEmail } from "../../../src/lib/checkout-contact";
import { digest, newChallenge, orderPreview, publicOrder } from "./order-verification";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import process from "node:process";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, GetItemCommand, PutItemCommand, ScanCommand, QueryCommand, UpdateItemCommand, DeleteItemCommand, type AttributeValue } from "@aws-sdk/client-dynamodb";
import { downloadEtsyImage } from "../../../src/lib/download-etsy-image";
import { etsyUploadId, isEtsyImage } from "../../../src/lib/etsy-image-import";
import { mediaUploadPrefix } from "../../../src/lib/media-paths";
import { activePayPalCredentials, paypalSettingsSummary, updatePayPalSettings } from "../../../src/lib/paypal-settings";
import { calculateCartTotals } from "../../../src/lib/cart-totals";
import { defaultContent, type ShopContent } from "../../../src/lib/content";
import type { Listing } from "../../../src/lib/catalog";
import type { CartItem } from "../../../src/lib/shopping";
import { readPayPalSettings, writePayPalSettings } from "./paypal-storage";
import { cartOrderId, placeOrder, orderOwners, ownedOrderDetails, OrderError, type OrderRecord } from "./orders";
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
  if (path.startsWith("/order-finder") && method === "POST") {
    try {
      const input = body(event, 2048);
      let email = "";
      try { email = input.email ? checkoutEmail(input.email) : ""; } catch { throw new OrderError("Enter a valid email address."); }
      const now = Math.floor(Date.now() / 1000);
      const emailOrders = async () => {
        const result = await db.send(new QueryCommand({ TableName: process.env.ORDER_TABLE, IndexName: "byEmail",
          KeyConditionExpression: "email = :email", ExpressionAttributeValues: { ":email": { S: email } }, Limit: 100 }));
        return (result.Items ?? []).map(item => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, decode(value)])));
      };
      if (path === "/order-finder/code") {
        if (!email) throw new OrderError("Enter your email address.");
        if (!process.env.ORDER_EMAIL_FROM) throw new OrderError("Email verification is not available yet. Please try again later.", 503);
        const challenge = newChallenge(email, now);
        const item = Object.fromEntries(Object.entries(challenge.record).map(([key, value]) => [key, typeof value === "number" ? { N: String(value) } : { S: value }]));
        try { await db.send(new PutItemCommand({ TableName: process.env.VERIFICATION_TABLE, Item: item,
          ConditionExpression: "attribute_not_exists(id) OR sentAt < :cooldown", ExpressionAttributeValues: { ":cooldown": { N: String(now - 60) } } })); }
        catch (error) { if ((error as Error).name === "ConditionalCheckFailedException") throw new OrderError("Wait a minute before requesting another code.", 429); throw error; }
        // Send the same response for every valid email, including those with no orders.
        await new SESv2Client({}).send(new SendEmailCommand({ FromEmailAddress: process.env.ORDER_EMAIL_FROM,
          Destination: { ToAddresses: [email] }, Content: { Simple: { Subject: { Data: "Your Track order verification code" },
          Body: { Text: { Data: `Your Gifts By Artisans verification code is ${challenge.code}. It expires in 10 minutes. If you did not request it, you can ignore this email.` } } } } }));
        return json({ challenge: challenge.token });
      }
      if (path === "/order-finder/verify") {
        if (!email || typeof input.challenge !== "string" || !/^[a-f0-9]{64}$/.test(input.challenge) || typeof input.code !== "string" || !/^\d{6}$/.test(input.code)) throw new OrderError("Enter the six-digit verification code.");
        const key = { id: { S: digest(email) } };
        try { await db.send(new UpdateItemCommand({ TableName: process.env.VERIFICATION_TABLE, Key: key,
          UpdateExpression: "ADD attempts :one", ConditionExpression: "#token = :token AND expiresAt > :now AND attempts < :max",
          ExpressionAttributeNames: { "#token": "token" }, ExpressionAttributeValues: { ":one": { N: "1" }, ":token": { S: input.challenge }, ":now": { N: String(now) }, ":max": { N: "5" } } })); }
        catch (error) { if ((error as Error).name === "ConditionalCheckFailedException") throw new OrderError("The code expired or too many attempts were made. Request a new code."); throw error; }
        try { await db.send(new DeleteItemCommand({ TableName: process.env.VERIFICATION_TABLE, Key: key,
          ConditionExpression: "#token = :token AND codeHash = :hash AND expiresAt > :now",
          ExpressionAttributeNames: { "#token": "token" }, ExpressionAttributeValues: { ":token": { S: input.challenge }, ":hash": { S: digest(`${input.challenge}:${input.code}`) }, ":now": { N: String(now) } } })); }
        catch (error) { if ((error as Error).name === "ConditionalCheckFailedException") throw new OrderError("The verification code is incorrect or has already been used."); throw error; }
        return json({ orders: (await emailOrders()).map(publicOrder) });
      }
      if (path !== "/order-finder") return json({ error: "Not found." }, 404);
      if (email) return json({ previews: (await emailOrders()).map(orderPreview) });
      const trackingNumber = typeof input.trackingNumber === "string" ? input.trackingNumber.trim().toUpperCase() : "";
      if (!/^GBA-[A-F0-9]{32}$/.test(trackingNumber)) throw new OrderError("Enter an email address or tracking number.");
      const result = await db.send(new QueryCommand({ TableName: process.env.ORDER_TABLE, IndexName: "byTrackingNumber", KeyConditionExpression: "trackingNumber = :tracking", ExpressionAttributeValues: { ":tracking": { S: trackingNumber } }, Limit: 1 }));
      const item = result.Items?.[0];
      if (!item) throw new OrderError("No order matches those details.", 404);
      return json({ order: publicOrder(Object.fromEntries(Object.entries(item).map(([key, value]) => [key, decode(value)]))) });
    } catch (error) {
      // Log the error class only; never log email, codes, or order details.
      if (!(error instanceof OrderError)) console.error("Track order backend failure", { path, errorName: error instanceof Error ? error.name : "UnknownError" });
      return json({ error: error instanceof OrderError ? error.message : "Track order is temporarily unavailable. Try again." }, error instanceof OrderError ? error.status : 503);
    }
  }
  if ((path === "/orders" || /^\/orders\/[^/]+$/.test(path)) && method === "GET") {
    const token = event.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) return json({ error: "Sign in to view your orders." }, 401);
    let customer;
    try { customer = await customerVerifier.verify(token); }
    catch { return json({ error: "Sign in to view your orders." }, 401); }
    try {
      const owners = orderOwners({ sub: customer.sub, username: customer.username });
      if (path !== "/orders") {
        let id;
        try { id = decodeURIComponent(path.slice("/orders/".length)); } catch { return json({ error: "Invalid order ID." }, 400); }
        if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id)) return json({ error: "Invalid order ID." }, 400);
        const saved = await record(process.env.ORDER_TABLE, id);
        try { return json({ order: ownedOrderDetails(saved, { sub: customer.sub, username: customer.username }) }); }
        catch (error) { if (error instanceof OrderError) return json({ error: error.message }, error.status); throw error; }
      }
      let cursor: Record<string, AttributeValue> | undefined;
      const rawCursor = event.queryStringParameters?.nextToken;
      if (rawCursor) {
        if (rawCursor.length > 1024) return json({ error: "Invalid order page." }, 400);
        try {
          const decoded = JSON.parse(Buffer.from(rawCursor, "base64url").toString("utf8"));
          if (!decoded || typeof decoded.id?.S !== "string" || Object.keys(decoded).length !== 1) throw new Error();
          cursor = { id: { S: decoded.id.S } };
        } catch { return json({ error: "Invalid order page." }, 400); }
      }
      const result = await db.send(new ScanCommand({ TableName: process.env.ORDER_TABLE, ConsistentRead: true, Limit: 100,
        ExclusiveStartKey: cursor, FilterExpression: "#owner IN (:combined, :sub, :username)",
        ExpressionAttributeNames: { "#owner": "owner" }, ExpressionAttributeValues: { ":combined": { S: owners[0] }, ":sub": { S: owners[1] }, ":username": { S: owners[2] } } }));
      const orders = (result.Items ?? []).map(item => {
        const record = Object.fromEntries(Object.entries(item).map(([key, value]) => [key, decode(value)]));
        // Return account data only, not the internal retry fingerprint.
        const { requestFingerprint: _fingerprint, __typename: _typename, ...order } = record;
        return order;
      });
      return json({ orders, nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64url") : null });
    } catch { return json({ error: "Could not load your order history. Please try again." }, 503); }
  }
  if (path === "/cart/status" && method === "POST") {
    try {
      const input = body(event,1024);
      const mode = process.env.PAYPAL_MODE === "live" && event.headers["x-paypal-mode"] !== "sandbox" ? "live" : "sandbox";
      const [payment,sample] = await Promise.all([record(process.env.ORDER_TABLE,cartOrderId(input.cartId,mode)),record(process.env.ORDER_TABLE,cartOrderId(input.cartId,"sample"))]);
      return json({ placed: payment?.status === "paid" || !!sample });
    } catch (error) { return json({ error:error instanceof OrderError ? error.message : "Could not check cart status. Please retry." },error instanceof OrderError ? error.status : 503); }
  }
  if (path === "/paypal/config" && method === "GET") {
    try {
      const environment = process.env.PAYPAL_MODE === "live" && event.headers["x-paypal-mode"] !== "sandbox" ? "live" : "sandbox";
      const settings = await readPayPalSettings();
      const configured = !!(settings[environment].clientId && settings[environment].secret);
      return json({ configured, environment, clientId: configured ? settings[environment].clientId : "", currency: "USD" });
    } catch { return json({ error: "PayPal settings could not be loaded." },503); }
  }
  if ((path === "/orders" || path === "/paypal/create" || path === "/paypal/capture" || path === "/paypal/confirmation") && method === "POST") {
    const token = event.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
    let customer = null;
    if (token) {
      try { customer = await customerVerifier.verify(token); }
      catch { return json({ error: "Your sign-in session expired. Sign in again or continue as a guest." }, 401); }
    }
    try {
      const input = body(event, 128 * 1024);
      const paymentMode = path.startsWith("/paypal/") ? (process.env.PAYPAL_MODE === "live" && event.headers["x-paypal-mode"] !== "sandbox" ? "live" : "sandbox") : undefined;
      const credentials = paymentMode && path !== "/paypal/confirmation" ? activePayPalCredentials(await readPayPalSettings(),paymentMode) : undefined;
      const receipt = await placeOrder(input, customer ? { sub: customer.sub, username: customer.username } : null, {
        getOrder: async id => await record(process.env.ORDER_TABLE, id) as OrderRecord | null,
        address: id => record(process.env.ADDRESS_TABLE, id),
        catalog: async ids => {
          const settings = await record(process.env.SHOP_SETTINGS_TABLE, "website");
          const raw = typeof settings?.content === "string" ? JSON.parse(settings.content) : settings?.content;
          const listings = (await Promise.all(ids.map(id => record(process.env.LISTING_TABLE, id)))).filter(Boolean) as unknown as Listing[];
          return { listings: listings.map(item => ({ ...item, published: true })), content: { ...defaultContent, ...raw } as ShopContent };
        },
        create: async order => {
          if (path === "/paypal/confirmation") throw new OrderError("Order confirmation not found.",404);
          const Item = Object.fromEntries(Object.entries(order).map(([key, value]) => [key, typeof value === "number" ? { N: String(value) } : typeof value === "boolean" ? { BOOL: value } : { S: value }]));
          try { await db.send(new PutItemCommand({ TableName: process.env.ORDER_TABLE, Item, ConditionExpression: "attribute_not_exists(id)" })); return true; }
          catch (error) { if (error instanceof Error && error.name === "ConditionalCheckFailedException") return false; throw error; }
        },
      }, paymentMode);
      if (paymentMode) {
        const order = await record(process.env.ORDER_TABLE,receipt.id) as OrderRecord;
        if (order.paymentMethod !== "paypal" || order.paypalMode !== paymentMode) throw new OrderError("Payment session does not match this checkout.",409);
        if (path === "/paypal/confirmation") {
          if (order.status !== "paid") throw new OrderError("Payment has not been confirmed for this order.",409);
          return json({ order:publicOrder(order) });
        }
        if (order.status === "paid") return json({ paid: true, receipt });
        if (!credentials) throw new OrderError("PayPal credentials are unavailable.",503);
        const paypal = paypalClient(paymentMode,credentials);
        const confirmPayment = async (payment: Parameters<typeof captureReceipt>[0]) => {
          const captureId = captureReceipt(payment,order);
          if (payment.id !== order.paypalOrderId) throw new OrderError("Payment session does not match this checkout.",409);
          await db.send(new UpdateItemCommand({ TableName:process.env.ORDER_TABLE, Key:{id:{S:order.id}}, UpdateExpression:"SET #status = :paid, paypalCaptureId = :capture, updatedAt = :now", ConditionExpression:"paypalOrderId = :paypal AND (#status = :pending OR #status = :paid)", ExpressionAttributeNames:{"#status":"status"}, ExpressionAttributeValues:{":paid":{S:"paid"},":pending":{S:"pending"},":capture":{S:captureId},":paypal":{S:order.paypalOrderId!},":now":{S:new Date().toISOString()}} }));
          return json({ paid:true, receipt:{...receipt,status:"paid"} });
        };
        if (path === "/paypal/create") {
          if (order.paypalOrderId) {
            const existing = await paypal.get(order.paypalOrderId);
            if (existing.status === "COMPLETED") return await confirmPayment(existing);
            return json({ orderID:order.paypalOrderId });
          }
          if (order.total <= 0) throw new OrderError("PayPal requires a positive order total.");
          const created = await paypal.create(order);
          if (typeof created.id !== "string" || !/^[A-Z0-9]{1,64}$/.test(created.id)) throw new Error("Invalid PayPal order response");
          await db.send(new UpdateItemCommand({ TableName:process.env.ORDER_TABLE, Key:{id:{S:order.id}}, UpdateExpression:"SET paypalOrderId = :paypal", ConditionExpression:"attribute_exists(id) AND (attribute_not_exists(paypalOrderId) OR paypalOrderId = :paypal)", ExpressionAttributeValues:{":paypal":{S:created.id}} }));
          return json({ orderID:created.id });
        }
        if (typeof input.orderID !== "string" || !/^[A-Z0-9]{1,64}$/.test(input.orderID) || order.paypalOrderId !== input.orderID) throw new OrderError("Payment session does not match this checkout.",409);
        let payment = await paypal.get(input.orderID);
        if (payment.status !== "COMPLETED") payment = await paypal.capture(input.orderID);
        return await confirmPayment(payment);
      }
      return json(receipt, 201);
    } catch (error) { return json({ error: error instanceof OrderError ? error.message : "Could not place your order. Please retry." }, error instanceof OrderError ? error.status : 503); }
  }
  if (!((path === "/admin/orders" && method === "GET") || (/^\/admin\/orders\/[a-zA-Z0-9_-]{1,200}$/.test(path) && method === "PUT") || (path === "/admin/paypal" && (method === "GET" || method === "PUT")) || (path === "/import-image" && method === "POST"))) return json({ error: "Not found." }, 404);
  const token = event.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return json({ error: "Admin sign-in required." }, 401);
  try { await verifier.verify(token); } catch { return json({ error: "Admin sign-in required." }, 403); }
  if (path === "/admin/orders" || path.startsWith("/admin/orders/")) {
    const adminOrder = (item: Record<string, AttributeValue>) => {
      const decoded = Object.fromEntries(Object.entries(item).map(([key,value]) => [key, decode(value)]));
      return { ...publicOrder(decoded), isGuest: typeof decoded.owner === "string" && decoded.owner.startsWith("guest:") };
    };
    try {
      if (method === "GET") {
        let cursor: Record<string, AttributeValue> | undefined;
        const token = event.queryStringParameters?.nextToken;
        if (token) { try { const parsed = JSON.parse(Buffer.from(token, "base64url").toString()); if (token.length > 1024 || typeof parsed.id?.S !== "string" || Object.keys(parsed).length !== 1) throw new Error(); cursor = { id: { S: parsed.id.S } }; } catch { return json({ error: "Invalid order page." }, 400); } }
        const result = await db.send(new ScanCommand({ TableName: process.env.ORDER_TABLE, Limit: 100, ExclusiveStartKey: cursor, ConsistentRead: true }));
        return json({ orders: (result.Items ?? []).map(adminOrder), nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64url") : null });
      }
      let update;
      try { update = orderUpdate(body(event)); } catch (error) { return json({ error: (error as Error).message }, 400); }
      const values: Record<string, AttributeValue> = { ":progress": { S: update.progress }, ":now": { S: new Date().toISOString() } };
      let expression = "SET fulfillmentProgress = :progress, updatedAt = :now";
      if (update.shipmentTrackingNumber !== undefined) { expression += ", shipmentTrackingNumber = :tracking"; values[":tracking"] = { S: update.shipmentTrackingNumber }; }
      if (update.trackingUrl !== undefined) { expression += ", trackingUrl = :url"; values[":url"] = { S: update.trackingUrl }; }
      if (update.shipBy) { expression += ", shipBy = :ship"; values[":ship"] = { S: update.shipBy }; }
      if (update.progress === "completed") expression += ", completedAt = if_not_exists(completedAt, :now)";
      const remove = [...(update.shipBy === null ? ["shipBy"] : []), ...(update.progress !== "completed" ? ["completedAt"] : [])];
      if (remove.length) expression += ` REMOVE ${remove.join(", ")}`;
      const result = await db.send(new UpdateItemCommand({ TableName: process.env.ORDER_TABLE, Key: { id: { S: path.split("/").pop()! } }, ConditionExpression: "attribute_exists(id)", UpdateExpression: expression, ExpressionAttributeValues: values, ReturnValues: "ALL_NEW" }));
      return json({ order: adminOrder(result.Attributes ?? {}) });
    } catch (error) { return json({ error: (error as Error).name === "ConditionalCheckFailedException" ? "Order not found." : "Could not load or update orders." }, (error as Error).name === "ConditionalCheckFailedException" ? 404 : 503); }
  }
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
