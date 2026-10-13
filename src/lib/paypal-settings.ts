export const paypalEnvironments = ["sandbox", "live"] as const;
export type PayPalEnvironment = typeof paypalEnvironments[number];
export type PayPalCredentials = { clientId: string; secret: string };
export type PayPalSettings = { sandbox: PayPalCredentials; live: PayPalCredentials };
export function emptyPayPalSettings(): PayPalSettings {
  return { sandbox: { clientId: "", secret: "" }, live: { clientId: "", secret: "" } };
}
export function automaticPayPalEnvironment(nodeEnv: string | undefined): PayPalEnvironment {
  return nodeEnv === "production" ? "live" : "sandbox";
}
export function activePayPalCredentials(settings: PayPalSettings, environment: PayPalEnvironment) {
  const credentials = settings[environment];
  if (!credentials.clientId || !credentials.secret) throw new Error(`PayPal ${environment} credentials are not configured.`);
  return { environment, ...credentials };
}
export function paypalSettingsSummary(settings: PayPalSettings, environment: PayPalEnvironment) {
  return { environment, configured: Boolean(settings[environment].clientId && settings[environment].secret),
    sandbox: { clientId: settings.sandbox.clientId, hasSecret: Boolean(settings.sandbox.secret) },
    live: { clientId: settings.live.clientId, hasSecret: Boolean(settings.live.secret) } };
}
export type PayPalSettingsSummary = ReturnType<typeof paypalSettingsSummary>;
export function updatePayPalSettings(current: PayPalSettings, input: unknown): PayPalSettings {
  if (!input || typeof input !== "object") throw new Error("Invalid PayPal settings.");
  const body = input as Record<string, unknown>;
  const next: PayPalSettings = { sandbox: { ...current.sandbox }, live: { ...current.live } };
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
  return next;
}
