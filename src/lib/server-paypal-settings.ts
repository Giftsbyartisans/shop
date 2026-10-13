import "server-only";
import outputs from "../../amplify_outputs.json";
import { emptyPayPalSettings, type PayPalSettings } from "./paypal-settings";
import { decryptPayPalSettings, encryptPayPalSettings } from "./paypal-encryption";

async function graphql(token: string, query: string, variables: Record<string, unknown>) {
  const response = await fetch(outputs.data.url, {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error("PayPal database request failed.");
  const result = await response.json();
  if (result.errors?.length || !result.data) throw new Error("PayPal database is unavailable. Deploy the PaymentSettings model and check admin access.");
  return result.data;
}
async function getRecord(token: string): Promise<{ id: string; encryptedContent: string } | null> {
  const result = await graphql(token, "query GetPayPalSettings($id: ID!) { getPaymentSettings(id: $id) { id encryptedContent } }", { id: "paypal" });
  return result.getPaymentSettings;
}
export async function readPayPalSettings(token: string): Promise<PayPalSettings> {
  // Validate configuration even before a record exists.
  encryptPayPalSettings("{}", process.env.PAYPAL_ENCRYPTION_KEY);
  const record = await getRecord(token);
  if (!record) return emptyPayPalSettings();
  return JSON.parse(decryptPayPalSettings(record.encryptedContent, process.env.PAYPAL_ENCRYPTION_KEY)) as PayPalSettings;
}
export async function writePayPalSettings(settings: PayPalSettings, token: string) {
  const encryptedContent = encryptPayPalSettings(JSON.stringify(settings), process.env.PAYPAL_ENCRYPTION_KEY);
  const existing = await getRecord(token);
  const action = existing ? "update" : "create";
  const inputType = existing ? "UpdatePaymentSettingsInput!" : "CreatePaymentSettingsInput!";
  await graphql(token, `mutation SavePayPalSettings($input: ${inputType}) { ${action}PaymentSettings(input: $input) { id } }`,
    { input: { id: "paypal", encryptedContent } });
}
