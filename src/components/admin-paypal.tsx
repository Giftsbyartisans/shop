"use client";
import { useEffect, useState } from "react";
import { backendApiUrl } from "@/lib/backend-api";
import { fetchAuthSession } from "aws-amplify/auth";
import { paypalEnvironments, type PayPalSettingsSummary } from "@/lib/paypal-settings";

async function requestSettings(body?: unknown): Promise<PayPalSettingsSummary> {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken.toString();
  if (!token) throw new Error("Admin sign-in required.");
  const response = await fetch(backendApiUrl("/admin/paypal"), { method: body ? "PUT" : "GET", cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-PayPal-Mode": process.env.NODE_ENV === "production" ? "live" : "sandbox" },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    if (response.status === 404) throw new Error("The PayPal settings API was not found (404). Restart the development server or deploy the updated website.");
    throw new Error(`The PayPal settings API returned a web page instead of JSON (HTTP ${response.status}). Check the server logs and deployment for the Lambda backend.`);
  }
  let result;
  try { result = await response.json(); }
  catch { throw new Error("The PayPal settings API returned an invalid response. Check the server logs."); }
  if (!response.ok) throw new Error(result.error || "PayPal settings request failed.");
  return result;
}
export default function AdminPayPal() {
  const [settings, setSettings] = useState<PayPalSettingsSummary | null>(null);
  const [secrets, setSecrets] = useState({ sandbox: "", live: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  async function load() {
    setBusy(true); setMessage(""); setFailed(false);
    try { setSettings(await requestSettings()); }
    catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "Could not load PayPal settings."); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    let active = true;
    requestSettings().then(value => { if (active) setSettings(value); }).catch(error => {
      if (active) { setFailed(true); setMessage(error instanceof Error ? error.message : "Could not load PayPal settings."); }
    });
    return () => { active = false; };
  }, []);
  async function save() {
    if (!settings) return;
    setBusy(true); setMessage(""); setFailed(false);
    try {
      const result = await requestSettings({
        sandbox: { clientId: settings.sandbox.clientId, secret: secrets.sandbox },
        live: { clientId: settings.live.clientId, secret: secrets.live } });
      setSettings(result); setSecrets({ sandbox: "", live: "" }); setMessage("PayPal settings saved.");
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "Could not save PayPal settings."); }
    finally { setBusy(false); }
  }
  return <>
    <p>Configure your PayPal REST app credentials. Sandbox is for testing; live mode uses your production account.</p>
    <p><a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener noreferrer">Get credentials from PayPal Apps & Credentials ↗</a></p>
    {message && <p role={failed ? "alert" : "status"}>{message}</p>}
    {!settings ? <button type="button" disabled={busy} onClick={load}>{busy ? "Loading…" : "Reload PayPal settings"}</button> : <fieldset disabled={busy}>
      <p role="status"><strong>Active mode: {settings.environment === "sandbox" ? "Sandbox (testing)" : "Live"}</strong></p>
      <p className="manager-help">Selected automatically by the server: this local frontend uses sandbox; production uses live credentials.</p>
      {!settings.configured && <p role="status">Enter {settings.environment} credentials to configure payments for this environment.</p>}
      {paypalEnvironments.map(environment => <section className="manager-entry" key={environment}>
        <h2>{environment === "sandbox" ? "Sandbox credentials" : "Live credentials"}</h2>
        <label>Client ID (API key)<input autoComplete="off" spellCheck={false} maxLength={1024} value={settings[environment].clientId}
          onChange={event => setSettings({ ...settings, [environment]: { ...settings[environment], clientId: event.target.value } })} /></label>
        <label>Client Secret<input type="password" autoComplete="new-password" maxLength={1024} value={secrets[environment]}
          placeholder={settings[environment].hasSecret ? "Saved — leave blank to keep" : "Enter Client Secret"}
          onChange={event => setSecrets({ ...secrets, [environment]: event.target.value })} /></label>
        <p className="manager-help">{settings[environment].hasSecret ? "A secret is saved securely. Enter a new value to replace it." : "No secret saved yet."} Clear the Client ID to remove this environment’s credentials.</p>
      </section>)}
      <p className="manager-help">PayPal settings save separately from website content. Saved secrets are never displayed.</p>
      <button className="primary" type="button" onClick={save}>{busy ? "Saving…" : "Save PayPal settings"}</button>
    </fieldset>}
  </>;
}
