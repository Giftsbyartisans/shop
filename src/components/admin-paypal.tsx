"use client";
import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { paypalEnvironments, type PayPalEnvironment, type PayPalSettingsSummary } from "@/lib/paypal-settings";

async function requestSettings(body?: unknown): Promise<PayPalSettingsSummary> {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken.toString();
  if (!token) throw new Error("Admin sign-in required.");
  const response = await fetch("/api/admin/paypal", { method: body ? "PUT" : "GET", cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    if (response.status === 404) throw new Error("The PayPal settings API was not found (404). Restart the development server or deploy the updated website.");
    throw new Error(`The PayPal settings API returned a web page instead of JSON (HTTP ${response.status}). Check the server logs and deployment for /api/admin/paypal.`);
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
      const result = await requestSettings({ environment: settings.environment,
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
      <label>Environment<select value={settings.environment} onChange={event => setSettings({ ...settings, environment: event.target.value as PayPalEnvironment })}>
        <option value="sandbox">Sandbox (testing)</option><option value="live">Live</option>
      </select></label>
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
