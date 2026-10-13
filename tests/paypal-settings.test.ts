import { test } from "node:test";
import assert from "node:assert/strict";
import { activePayPalCredentials, automaticPayPalEnvironment, emptyPayPalSettings, paypalSettingsSummary, updatePayPalSettings } from "../src/lib/paypal-settings";

test("PayPal summaries never return secrets", () => {
  const current = emptyPayPalSettings();
  current.sandbox = { clientId: "sandbox-id", secret: "private-secret" };
  const summary = paypalSettingsSummary(current, "sandbox");
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
test("reject incomplete credentials and changed IDs without new secrets", () => {
  const current = emptyPayPalSettings();
  assert.throws(() => updatePayPalSettings(current, { ...current, sandbox: { clientId: "", secret: "orphan" } }));
  current.sandbox = { clientId: "id", secret: "secret" };
  assert.throws(() => updatePayPalSettings(current, { ...current, sandbox: { clientId: "changed", secret: "" } }));
});

test("PayPal mode follows the server environment and ignores client or saved mode", () => {
  assert.equal(automaticPayPalEnvironment("production"), "live");
  for (const value of ["development", "test", undefined]) assert.equal(automaticPayPalEnvironment(value), "sandbox");
  const current = emptyPayPalSettings();
  current.sandbox = { clientId: "test-id", secret: "test-secret" };
  current.live = { clientId: "live-id", secret: "live-secret" };
  const saved = updatePayPalSettings(current, { ...current, environment: "sandbox" });
  assert.equal("environment" in saved, false);
  assert.equal(paypalSettingsSummary(saved, automaticPayPalEnvironment("production")).environment, "live");
  assert.equal(activePayPalCredentials(saved, "live").secret, "live-secret");
  assert.equal(activePayPalCredentials(saved, "sandbox").secret, "test-secret");
});
test("missing active credentials never fall back to the other environment", () => {
  const current = emptyPayPalSettings();
  current.sandbox = { clientId: "test-id", secret: "test-secret" };
  assert.throws(() => activePayPalCredentials(current, "live"), /live credentials are not configured/);
  assert.equal(paypalSettingsSummary(current, "live").configured, false);
});
