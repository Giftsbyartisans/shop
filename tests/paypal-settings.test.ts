import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPayPalSettings, paypalSettingsSummary, updatePayPalSettings } from "../src/lib/paypal-settings";

test("PayPal summaries never return secrets", () => {
  const current = emptyPayPalSettings();
  current.sandbox = { clientId: "sandbox-id", secret: "private-secret" };
  const summary = paypalSettingsSummary(current);
  assert.equal(summary.sandbox.hasSecret, true);
  assert.equal(JSON.stringify(summary).includes("private-secret"), false);
});
test("blank secrets preserve saved credentials, replacements and clearing work", () => {
  const current = emptyPayPalSettings();
  current.sandbox = { clientId: "id", secret: "saved" };
  const body = { ...current, sandbox: { clientId: "id", secret: "" } };
  assert.equal(updatePayPalSettings(current, body).sandbox.secret, "saved");
  assert.equal(updatePayPalSettings(current, { ...body, sandbox: { clientId: "id", secret: "replacement" } }).sandbox.secret, "replacement");
  assert.deepEqual(updatePayPalSettings(current, { ...body, sandbox: { clientId: "", secret: "" } }).sandbox, { clientId: "", secret: "" });
  assert.equal(current.sandbox.secret, "saved");
});
test("reject incomplete credentials, changed IDs without new secrets, and unconfigured live mode", () => {
  const current = emptyPayPalSettings();
  assert.throws(() => updatePayPalSettings(current, { ...current, environment: "live" }));
  assert.throws(() => updatePayPalSettings(current, { ...current, sandbox: { clientId: "", secret: "orphan" } }));
  current.sandbox = { clientId: "id", secret: "secret" };
  assert.throws(() => updatePayPalSettings(current, { ...current, sandbox: { clientId: "changed", secret: "" } }));
});
