import { test } from "node:test";
import assert from "node:assert/strict";
import { encryptPayPalSettings, decryptPayPalSettings } from "../src/lib/paypal-encryption";
const key = "ab".repeat(32);
test("PayPal credentials roundtrip without plaintext and use fresh IVs", () => {
  const text = JSON.stringify({ secret: "private-paypal-secret", clientId: "client" });
  const a = encryptPayPalSettings(text, key), b = encryptPayPalSettings(text, key);
  assert.notEqual(a, b);
  assert.equal(a.includes("private-paypal-secret"), false);
  assert.equal(decryptPayPalSettings(a, key), text);
});
test("tampered credentials and wrong encryption keys cannot be decrypted", () => {
  const value = encryptPayPalSettings("credentials", key);
  const parts = value.split(".");
  const ciphertext = Buffer.from(parts[3], "base64"); ciphertext[0] ^= 1;
  parts[3] = ciphertext.toString("base64");
  assert.throws(() => decryptPayPalSettings(parts.join("."), key));
  assert.throws(() => decryptPayPalSettings(value, "cd".repeat(32)));
  assert.throws(() => decryptPayPalSettings("invalid", key));
});
test("missing or invalid server keys fail closed", () => {
  for (const invalid of [undefined, "", "short", "zz".repeat(32)]) assert.throws(() => encryptPayPalSettings("credentials", invalid));
});
