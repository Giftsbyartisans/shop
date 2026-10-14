export function checkoutEmail(value: unknown): string {
  if (typeof value !== "string") throw new Error("Enter your email address.");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return email;
}
export function checkoutAddress(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Complete your shipping address.");
  const source = value as Record<string, unknown>, result: Record<string, string> = {};
  for (const key of ["recipient", "line1", "line2", "city", "region", "postalCode", "country", "phone"]) {
    const text = typeof source[key] === "string" ? source[key].trim() : "";
    if ((!["line2", "region"].includes(key) && !text) || text.length > (key === "phone" || key === "postalCode" ? 30 : 150)) throw new Error("Complete all required shipping address fields.");
    result[key] = text;
  }
  if (typeof source.label === "string") {
    if (source.label.length > 40) throw new Error("Use an address label of up to 40 characters.");
    result.label = source.label.trim();
  }
  const digits = result.phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15 || !/^\+?[\d\s().-]+$/.test(result.phone)) throw new Error("Enter a valid mobile number.");
  return result;
}
