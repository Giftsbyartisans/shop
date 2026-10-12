import "./customer-auth";
import { generateClient } from "aws-amplify/data";
import { getCurrentUser } from "aws-amplify/auth";
import type { Schema } from "../../amplify/data/resource";

const client = generateClient<Schema>();
const auth = { authMode: "userPool" as const };
export type Address = Pick<Schema["ShippingAddress"]["type"], "id" | "label" | "recipient" | "line1" | "line2" | "city" | "region" | "postalCode" | "country" | "phone"> & { isDefault?: boolean };
export type CustomerOrder = Schema["CustomerOrder"]["type"];
export type AddressInput = Omit<Address, "id">;
function requireModel(name: "ShippingAddress" | "CustomerOrder" | "CustomerPreferences") {
  if (!client.models[name]) {
    throw new Error(name === "ShippingAddress"
      ? "Shipping addresses are not available yet. The shop needs a backend update before addresses can be saved."
      : name === "CustomerOrder" ? "Order history is not available yet. The shop needs a backend update before orders can be displayed."
      : "Default addresses need a shop backend update before they can be saved.");
  }
}
function check(result: { errors?: readonly { message: string }[] }) {
  if (result.errors?.length) throw new Error("Could not access your account records. Please try again. If this continues, contact the shop.");
}
export async function loadAddresses(): Promise<Address[]> {
  requireModel("ShippingAddress");
  const records: Address[] = [];
  let nextToken: string | null | undefined;
  do {
    const result = await client.models.ShippingAddress.list({ ...auth, nextToken, limit: 100 });
    check(result); records.push(...result.data); nextToken = result.nextToken;
  } while (nextToken);
  if (!client.models.CustomerPreferences) return records;
  const { userId } = await getCurrentUser();
  const preferences = await client.models.CustomerPreferences.get({ id: userId }, auth);
  check(preferences);
  return records.map(record => ({ ...record, isDefault: record.id === preferences.data?.defaultAddressId }));
}
export async function saveAddress(input: AddressInput, id?: string) {
  requireModel("ShippingAddress");
  const { isDefault, ...fields } = input;
  if (isDefault) requireModel("CustomerPreferences");
  const result = id ? await client.models.ShippingAddress.update({ ...fields, id }, auth)
    : await client.models.ShippingAddress.create(fields, auth);
  check(result);
  if (!result.data) throw new Error("Your address could not be saved.");
  if (isDefault) await markDefaultAddress(result.data.id);
  else if (client.models.CustomerPreferences) {
    const { userId } = await getCurrentUser();
    const preferences = await client.models.CustomerPreferences.get({ id: userId }, auth);
    check(preferences);
    if (preferences.data?.defaultAddressId === result.data.id) check(await client.models.CustomerPreferences.update({ id: userId, defaultAddressId: null }, auth));
  }
  return { ...result.data, isDefault: Boolean(isDefault) };
}
export async function markDefaultAddress(id: string) {
  requireModel("CustomerPreferences");
  requireModel("ShippingAddress");
  const address = await client.models.ShippingAddress.get({ id }, auth);
  check(address);
  if (!address.data) throw new Error("This address is no longer available.");
  const { userId } = await getCurrentUser();
  const preferences = await client.models.CustomerPreferences.get({ id: userId }, auth);
  check(preferences);
  const result = preferences.data
    ? await client.models.CustomerPreferences.update({ id: userId, defaultAddressId: id }, auth)
    : await client.models.CustomerPreferences.create({ id: userId, defaultAddressId: id }, auth);
  check(result);
  if (!result.data) throw new Error("Could not set the default address.");
}
export async function deleteAddress(id: string) {
  requireModel("ShippingAddress");
  check(await client.models.ShippingAddress.delete({ id }, auth));
}
export async function loadOrders(): Promise<CustomerOrder[]> {
  requireModel("CustomerOrder");
  const records: CustomerOrder[] = [];
  let nextToken: string | null | undefined;
  do {
    const result = await client.models.CustomerOrder.list({ ...auth, nextToken, limit: 100 });
    check(result); records.push(...result.data); nextToken = result.nextToken;
  } while (nextToken);
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
