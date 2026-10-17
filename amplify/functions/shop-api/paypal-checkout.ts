import { createHash } from 'node:crypto';
import { OrderError, type OrderRecord } from './orders';
import type { PayPalCredentials, PayPalEnvironment } from '../../../src/lib/paypal-settings';
export type PayPalOrder = { id?: string; status?: string; purchase_units?: { custom_id?: string; amount?: { currency_code?: string; value?: string }; payments?: { captures?: { id?: string; status?: string; amount?: { currency_code?: string; value?: string } }[] } }[] };
export function captureReceipt(payment: PayPalOrder, order: Pick<OrderRecord,'id'|'total'|'currency'>) {
  const units = payment.purchase_units;
  const captures = units?.[0]?.payments?.captures;
  const capture = captures?.[0];
  if (payment.status !== 'COMPLETED' || units?.length !== 1 || units[0].custom_id !== order.id || captures?.length !== 1 || capture?.status !== 'COMPLETED' || !capture.id || capture.amount?.currency_code !== order.currency || !/^\d+\.\d{2}$/.test(capture.amount?.value ?? '') || Math.round(Number(capture.amount?.value) * 100) !== Math.round(order.total * 100)) throw new OrderError('Payment is not confirmed. Please retry or contact the shop.',409);
  return capture.id;
}
export function paypalClient(environment: PayPalEnvironment, credentials: PayPalCredentials, transport: typeof fetch = fetch) {
  const base = environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  let accessToken: string | undefined;
  async function request(path: string, method = 'GET', payload?: unknown, requestId?: string): Promise<PayPalOrder> {
    if (!accessToken) {
      const response = await transport(`${base}/v1/oauth2/token`, { method:'POST', headers: { Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.secret}`).toString('base64')}`, 'Content-Type':'application/x-www-form-urlencoded' }, body:'grant_type=client_credentials', signal:AbortSignal.timeout(8000) });
      const result = await response.json();
      if (!response.ok || typeof result.access_token !== 'string') throw new OrderError('PayPal is unavailable. Check the shop payment configuration.',503);
      accessToken = result.access_token;
    }
    const response = await transport(`${base}${path}`, { method, headers: { Authorization:`Bearer ${accessToken}`, 'Content-Type':'application/json', Prefer:'return=representation', ...(requestId ? {'PayPal-Request-Id': createHash('sha256').update(requestId).digest('hex').slice(0,38)} : {}) }, ...(payload !== undefined ? {body:JSON.stringify(payload)} : {}), signal:AbortSignal.timeout(12000) });
    const result = await response.json();
    if (!response.ok) throw new OrderError('PayPal could not complete this request. Please retry.',502);
    return result;
  }
  return { create: (order: OrderRecord) => request('/v2/checkout/orders','POST', { intent:'CAPTURE', purchase_units:[{custom_id:order.id, invoice_id:order.orderNumber, amount:{currency_code:order.currency,value:order.total.toFixed(2)}}], application_context:{shipping_preference:'NO_SHIPPING'} }, `create:${order.id}`),
    get: (id:string) => request(`/v2/checkout/orders/${id}`),
    capture: (id:string) => request(`/v2/checkout/orders/${id}/capture`,'POST',{},`capture:${id}`) };
}

export async function completePaidOrder(payment: PayPalOrder, attempt: OrderRecord, store: {
  create(order: OrderRecord): Promise<boolean>;
  get(id: string): Promise<OrderRecord | null>;
}) {
  const captureId = captureReceipt(payment, attempt);
  if (payment.id !== attempt.paypalOrderId) throw new OrderError('Payment session does not match this checkout.', 409);
  const now = new Date().toISOString();
  const order: OrderRecord = { ...attempt, status: 'paid', paypalCaptureId: captureId, createdAt: now, updatedAt: now, __typename: 'CustomerOrder' };
  if (await store.create(order)) return order;
  const saved = await store.get(order.id);
  if (!saved || saved.paypalCaptureId !== captureId || saved.paypalOrderId !== payment.id || saved.owner !== attempt.owner || saved.requestFingerprint !== attempt.requestFingerprint) {
    throw new OrderError('Payment was received but the order could not be confirmed. Please retry or contact the shop.', 503);
  }
  return saved;
}
