import "./customer-auth";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";

const client = generateClient<Schema>();
const auth = { authMode: "userPool" as const };
export type Address = Pick<Schema["ShippingAddress"]["type"], "id" | "recipient" | "line1" | "line2" | "city" | "region" | "postalCode" | "country" | "phone">;
export type CustomerOrder = Schema["CustomerOrder"]["type"];
export type AddressInput = Omit<Address, "id">;
function requireModel(name: "ShippingAddress" | "CustomerOrder") {
  if (!client.models[name]) {
    throw new Error(name === "ShippingAddress"
      ? "Shipping addresses are not available yet. The shop needs a backend update before addresses can be saved."
      : "Order history is not available yet. The shop needs a backend update before orders can be displayed.");
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
  return records;
}
export async function saveAddress(input: AddressInput, id?: string) {
  requireModel("ShippingAddress");
  const result = id ? await client.models.ShippingAddress.update({ ...input, id }, auth)
    : await client.models.ShippingAddress.create(input, auth);
  check(result);
  if (!result.data) throw new Error("Your address could not be saved.");
  return result.data;
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
