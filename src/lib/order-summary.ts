export type OrderSummaryItem = { id: string; title: string; image?: string; quantity: number; unitPrice?: number; personalization?: string; personalizationPrice?: number; total?: number };
export function orderJson(value: unknown): unknown {
  try { return typeof value === "string" ? JSON.parse(value) : value; } catch { return null; }
}
export function orderSummaryItems(value: unknown): OrderSummaryItem[] {
  const items = orderJson(value);
  if (!Array.isArray(items)) return [];
  return items.filter(item => item && typeof item === "object" && typeof item.id === "string" && Number.isInteger(item.quantity) && item.quantity > 0).map(item => ({
    id: item.id, title: typeof item.title === "string" ? item.title : `Product ${item.id}`, quantity: item.quantity,
    image: typeof item.image === "string" ? item.image : undefined,
    unitPrice: typeof item.unitPrice === "number" && Number.isFinite(item.unitPrice) ? item.unitPrice : undefined,
    total: typeof item.total === "number" && Number.isFinite(item.total) ? item.total : undefined,
    personalization: typeof item.personalization === "string" ? item.personalization : undefined,
    personalizationPrice: typeof item.personalizationPrice === "number" && Number.isFinite(item.personalizationPrice) ? item.personalizationPrice : undefined,
  }));
}
export function orderSummaryAddress(value: unknown): Record<string, string> | null {
  const address = orderJson(value);
  if (!address || typeof address !== "object" || Array.isArray(address)) return null;
  return Object.fromEntries(Object.entries(address).filter(([, value]) => typeof value === "string")) as Record<string, string>;
}
