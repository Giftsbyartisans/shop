import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureReceipt, paypalClient, type PayPalOrder } from '../amplify/functions/shop-api/paypal-checkout';
import type { OrderRecord } from '../amplify/functions/shop-api/orders';
const order = {id:'server-order',orderNumber:'GBA-SERVER',total:42.50,currency:'USD'} as OrderRecord;
const completed = ():PayPalOrder => ({id:'PAYPAL123',status:'COMPLETED',purchase_units:[{custom_id:order.id,payments:{captures:[{id:'CAPTURE123',status:'COMPLETED',amount:{currency_code:'USD',value:'42.50'}}]}}]});
test('paid receipt requires the complete matching capture, not buyer approval', () => {
  assert.equal(captureReceipt(completed(),order),'CAPTURE123');
  for (const status of ['APPROVED','CREATED','PENDING']) { const payment=completed();payment.status=status;assert.throws(()=>captureReceipt(payment,order)); }
  const mismatches = [() => {const p=completed();p.purchase_units![0].custom_id='other';return p;}, () => {const p=completed();p.purchase_units![0].payments!.captures![0].amount!.value='0.01';return p;}, () => {const p=completed();p.purchase_units![0].payments!.captures![0].amount!.currency_code='EUR';return p;}, () => {const p=completed();p.purchase_units![0].payments!.captures![0].status='PENDING';return p;}, () => {const p=completed();p.purchase_units!.push(p.purchase_units![0]);return p;}];
  for(const make of mismatches) assert.throws(()=>captureReceipt(make(),order));
});
test('PayPal requests use server totals, credentials, mode and stable idempotency keys', async () => {
  const calls:{url:string;init?:RequestInit}[]=[];
  const transport = (async (url,init) => {calls.push({url:String(url),init});return Response.json(String(url).endsWith('/token') ? {access_token:'private-token'} : {id:'PAYPAL123',status:'CREATED'});}) as typeof fetch;
  const paypal=paypalClient('sandbox',{clientId:'client',secret:'secret'},transport);
  await paypal.create(order);await paypal.create(order);await paypal.capture('PAYPAL123');
  assert.equal(calls.length,4);
  assert.equal(calls[0].url,'https://api-m.sandbox.paypal.com/v1/oauth2/token');
  const body=JSON.parse(calls[1].init!.body as string);
  assert.equal(body.purchase_units[0].amount.value,'42.50');assert.equal(body.purchase_units[0].custom_id,order.id);
  assert.equal((calls[1].init!.headers as Record<string,string>)['PayPal-Request-Id'],(calls[2].init!.headers as Record<string,string>)['PayPal-Request-Id']);
  assert.notEqual((calls[1].init!.headers as Record<string,string>)['PayPal-Request-Id'],(calls[3].init!.headers as Record<string,string>)['PayPal-Request-Id']);
});
test('PayPal authentication failures do not expose credentials or response contents', async () => {
  const transport = (async()=>Response.json({error:'secret detail'},{status:401})) as typeof fetch;
  await assert.rejects(paypalClient('live',{clientId:'client',secret:'private'},transport).create(order),/PayPal is unavailable/);
});

test('only a completed matching capture creates a customer order', async () => {
  const { completePaidOrder } = await import('../amplify/functions/shop-api/paypal-checkout');
  const attempt = { ...order, paypalOrderId: 'PAYPAL123', owner: 'customer', requestFingerprint: 'snapshot', status: 'pending' } as OrderRecord;
  const records = new Map<string, OrderRecord>();
  const store = { create: async (value: OrderRecord) => { records.set(value.id, value); return true; }, get: async (id: string) => records.get(id) ?? null };
  for (const status of ['CREATED', 'APPROVED', 'VOIDED', 'PENDING']) {
    const payment = completed(); payment.status = status;
    await assert.rejects(completePaidOrder(payment, attempt, store));
    assert.equal(records.size, 0);
  }
  const mismatched = completed(); mismatched.id = 'OTHER123';
  await assert.rejects(completePaidOrder(mismatched, attempt, store));
  assert.equal(records.size, 0);
  const saved = await completePaidOrder(completed(), attempt, store);
  assert.equal(saved.status, 'paid');
  assert.equal(saved.paypalCaptureId, 'CAPTURE123');
  assert.equal(records.size, 1);
  assert.equal(attempt.status, 'pending');
});

test('payment retries preserve the existing order and fulfillment data', async () => {
  const { completePaidOrder } = await import('../amplify/functions/shop-api/paypal-checkout');
  const attempt = { ...order, paypalOrderId: 'PAYPAL123', owner: 'customer', requestFingerprint: 'snapshot' } as OrderRecord;
  const saved = { ...attempt, status: 'paid', paypalCaptureId: 'CAPTURE123', createdAt: '2026-10-01T00:00:00Z', fulfillmentProgress: 'completed' } as OrderRecord;
  assert.equal(await completePaidOrder(completed(), attempt, { create: async () => false, get: async () => saved }), saved);
  await assert.rejects(completePaidOrder(completed(), attempt, { create: async () => false, get: async () => ({ ...saved, paypalCaptureId: 'DIFFERENT' }) }));
});
