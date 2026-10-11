import "server-only";
import { headers } from "next/headers";

export async function siteOrigin() {
  if (process.env.SITE_URL) return new URL(process.env.SITE_URL).origin;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")?.split(",")[0].trim() || requestHeaders.get("host");
  if (!host) throw new Error("Set SITE_URL to the public website URL.");
  const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim() === "http" ? "http" : "https";
  return new URL(`${protocol}://${host}`).origin;
}
