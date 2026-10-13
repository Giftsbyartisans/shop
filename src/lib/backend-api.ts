import outputs from "../../amplify_outputs.json";

export function backendApiUrl(path: string) {
  const custom = outputs.custom as { backendApiUrl?: string } | undefined;
  if (!custom?.backendApiUrl) throw new Error("The Lambda backend has not been deployed. Deploy the backend and refresh amplify_outputs.json.");
  return `${custom.backendApiUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
export function backendFaviconUrl(source?: string) {
  try { return backendApiUrl(`/favicon${source ? `?source=${encodeURIComponent(source)}` : ""}`); }
  catch { return "/favicon.ico"; }
}
