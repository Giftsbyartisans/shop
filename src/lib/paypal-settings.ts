export const paypalEnvironments = ["sandbox", "live"] as const;
export type PayPalEnvironment = typeof paypalEnvironments[number];
export type PayPalCredentials = { clientId: string; secret: string };
export type PayPalSettings = { environment: PayPalEnvironment; sandbox: PayPalCredentials; live: PayPalCredentials };
export function emptyPayPalSettings(): PayPalSettings {
  return { environment: "sandbox", sandbox: { clientId: "", secret: "" }, live: { clientId: "", secret: "" } };
}
export function paypalSettingsSummary(settings: PayPalSettings) {
  return { environment: settings.environment,
    sandbox: { clientId: settings.sandbox.clientId, hasSecret: Boolean(settings.sandbox.secret) },
    live: { clientId: settings.live.clientId, hasSecret: Boolean(settings.live.secret) } };
}
export type PayPalSettingsSummary = ReturnType<typeof paypalSettingsSummary>;
export function updatePayPalSettings(current: PayPalSettings, input: unknown): PayPalSettings {
  if (!input || typeof input !== "object") throw new Error("Invalid PayPal settings.");
  const body = input as Record<string, unknown>;
  if (body.environment !== "sandbox" && body.environment !== "live") throw new Error("Choose sandbox or live mode.");
  const next = structuredClone(current);
  next.environment = body.environment;
  for (const environment of paypalEnvironments) {
    const values = body[environment];
    if (!values || typeof values !== "object") throw new Error("Enter credentials for each environment.");
    const pair = values as Record<string, unknown>;
    if (typeof pair.clientId !== "string" || typeof pair.secret !== "string" || pair.clientId.length > 1024 || pair.secret.length > 1024) throw new Error("Invalid PayPal credentials.");
    const clientId = pair.clientId.trim();
    const secret = pair.secret.trim();
    if (!clientId && secret) throw new Error("Enter a Client ID with the Secret.");
    if (clientId !== current[environment].clientId && !secret && clientId) throw new Error("Enter a new secret when changing a Client ID.");
    next[environment] = { clientId, secret: clientId ? secret || current[environment].secret : "" };
    if (Boolean(next[environment].clientId) !== Boolean(next[environment].secret)) throw new Error("Enter both Client ID and Secret, or leave both empty.");
  }
  if (next.environment === "live" && !next.live.clientId) throw new Error("Save live credentials before selecting live mode.");
  return next;
}
