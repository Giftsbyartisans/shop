import { cartLineKey, type CartItem } from './shopping';
export const validCartId = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
export function cartSignature(items: CartItem[]) {
  return JSON.stringify(items.map(item => [cartLineKey(item),item.quantity]).sort((a,b) => String(a[0]).localeCompare(String(b[0]))));
}
export function nextCartId(current: string | null | undefined, before: CartItem[], after: CartItem[], uuid: () => string = () => crypto.randomUUID()) {
  return validCartId(current) && cartSignature(before) === cartSignature(after) ? current : uuid();
}
