import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey(value: string | undefined) {
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) throw new Error("Set PAYPAL_ENCRYPTION_KEY to a 64-character hexadecimal key on the server.");
  return Buffer.from(value, "hex");
}
export function encryptPayPalSettings(plaintext: string, keyValue: string | undefined): string {
  const key = encryptionKey(keyValue);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from("shop:paypal-settings:v1"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}
export function decryptPayPalSettings(payload: string, keyValue: string | undefined): string {
  const key = encryptionKey(keyValue);
  const [version, ivText, tagText, ciphertextText, extra] = payload.split(".");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText || extra !== undefined) throw new Error("Invalid encrypted PayPal settings.");
  const iv = Buffer.from(ivText, "base64"), tag = Buffer.from(tagText, "base64");
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Invalid encrypted PayPal settings.");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from("shop:paypal-settings:v1"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64")), decipher.final()]).toString("utf8");
}
