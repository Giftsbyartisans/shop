import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { emptyPayPalSettings, type PayPalSettings } from "../../../src/lib/paypal-settings";
import { decryptPayPalSettings, encryptPayPalSettings } from "../../../src/lib/paypal-encryption";
const db = new DynamoDBClient({});
export async function readPayPalSettings(): Promise<PayPalSettings> {
  encryptPayPalSettings("{}", process.env.PAYPAL_ENCRYPTION_KEY);
  const result = await db.send(new GetItemCommand({ TableName: process.env.PAYMENT_SETTINGS_TABLE,
    Key: { id: { S: "paypal" } }, ConsistentRead: true }));
  if (!result.Item) return emptyPayPalSettings();
  return JSON.parse(decryptPayPalSettings(result.Item.encryptedContent.S!, process.env.PAYPAL_ENCRYPTION_KEY));
}
export async function writePayPalSettings(settings: PayPalSettings) {
  const encryptedContent = encryptPayPalSettings(JSON.stringify(settings), process.env.PAYPAL_ENCRYPTION_KEY);
  const now = new Date().toISOString();
  await db.send(new PutItemCommand({ TableName: process.env.PAYMENT_SETTINGS_TABLE,
    Item: { id: { S: "paypal" }, encryptedContent: { S: encryptedContent }, createdAt: { S: now }, updatedAt: { S: now }, __typename: { S: "PaymentSettings" } } }));
}
