"use client";
import { useEffect, useRef, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { backendApiUrl } from '@/lib/backend-api';
import { cartLineKey, type CartItem } from '@/lib/shopping';
import { updateShopping } from './shopping-controls';
type Receipt = { orderNumber:string; trackingNumber:string; isSample:boolean };
type Buttons = { render:(container:HTMLElement)=>Promise<void>; close:()=>Promise<void> };
type SDK = { Buttons:(options:{style:{layout:string};createOrder:()=>Promise<string>;onApprove:(data:{orderID:string})=>Promise<void>;onCancel:()=>void;onError:(error:unknown)=>void})=>Buttons };
const sdks = new Map<string,Promise<SDK>>();
function loadSDK(clientId:string,environment:string) {
  const key = `${environment}:${clientId}`;
  const existing = sdks.get(key); if (existing) return existing;
  const namespace = `paypalShop${environment}${clientId.slice(0,12).replace(/[^a-zA-Z0-9]/g,'')}`;
  const promise = new Promise<SDK>((resolve,reject) => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?${new URLSearchParams({'client-id':clientId,currency:'USD',intent:'capture',components:'buttons'})}`;
    script.dataset.namespace = namespace;
    script.onload = () => { const sdk = (window as unknown as Record<string,SDK>)[namespace]; if (typeof sdk?.Buttons === 'function') resolve(sdk); else reject(new Error('PayPal could not be loaded.')); };
    script.onerror = () => { script.remove(); sdks.delete(key); reject(new Error('PayPal could not load. Please refresh and try again.')); };
    document.head.appendChild(script);
  }); sdks.set(key,promise); return promise;
}
export default function PayPalCheckout({items,total,addressId,email,guestAddress,enabled,onPlaced}:{items:CartItem[];total:number;addressId:string;email:string;guestAddress?:Record<string,string>;enabled:boolean;onPlaced:(orderNumber:string,trackingNumber:string,isSample:boolean)=>void}) {
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef({items,total,addressId,email,guestAddress,onPlaced}); latest.current = {items,total,addressId,email,guestAddress,onPlaced};
  const [error,setError] = useState(''), [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [mode,setMode] = useState('');
  const pending = useRef<Record<string,unknown> | null>(null), finished = useRef(false);
  const frontendMode = process.env.NODE_ENV === 'production' ? 'live' : 'sandbox';
  async function api(path:string,body?:unknown) {
    const session = await fetchAuthSession(); const token = session.tokens?.accessToken.toString();
    const response = await fetch(backendApiUrl(path),{method:body ? 'POST':'GET',headers:{'Content-Type':'application/json','X-PayPal-Mode':frontendMode,...(token ? {Authorization:`Bearer ${token}`} : {})},...(body ? {body:JSON.stringify(body)} : {}),signal:AbortSignal.timeout(45000)});
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'PayPal request failed. Please retry.'); return result;
  }
  async function checkoutInput() {
    const session = await fetchAuthSession(); const current = latest.current;
    const signature = JSON.stringify({customer:session.tokens?.accessToken.payload.sub,items:current.items,total:current.total,addressId:current.addressId,email:current.email,guestAddress:current.guestAddress,mode:frontendMode});
    let requestId = crypto.randomUUID();
    try { const stored = JSON.parse(sessionStorage.getItem('shop-paypal-intent') || 'null'); if (stored?.signature === signature && typeof stored.requestId === 'string') requestId = stored.requestId; sessionStorage.setItem('shop-paypal-intent',JSON.stringify({signature,requestId})); } catch { if (pending.current?.signature === signature) requestId = pending.current.requestId as `${string}-${string}-${string}-${string}-${string}`; }
    const input = {items:current.items,expectedTotal:current.total,addressId:current.addressId,email:current.email,guestAddress:current.guestAddress,requestId};
    pending.current = {...input,signature}; return input;
  }
  async function finish(receipt:Receipt) {
    if (finished.current) return; finished.current = true;
    const snapshot = latest.current;
    // Clear only purchased quantities; preserve products added during payment.
    try { const quantities = new Map(snapshot.items.map(item => [cartLineKey(item),item.quantity]));
      await updateShopping(current => ({...current,cart:current.cart.flatMap(item => { const quantity = item.quantity-(quantities.get(cartLineKey(item))??0); return quantity>0 ? [{...item,quantity}] : []; })}));
      try { sessionStorage.removeItem('shop-paypal-intent'); } catch { /* Storage is optional. */ }
    } catch { /* Payment is confirmed even if cart synchronization is unavailable. */ }
    snapshot.onPlaced(receipt.orderNumber,receipt.trackingNumber,receipt.isSample);
  }
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    let active = true; let buttons:Buttons|undefined;
    setLoading(true); setError('');
    void (async () => {
      const config = await api('/paypal/config');
      if (!active) return;
      if (!config.configured) throw new Error('PayPal is not configured yet. Please contact the shop.');
      setMode(config.environment);
      const sdk = await loadSDK(config.clientId,config.environment);
      if (!active || !container.current) return;
      buttons = sdk.Buttons({style:{layout:'vertical'},
        createOrder:async () => { setError(''); setBusy(true); try { const input = await checkoutInput(); const result = await api('/paypal/create',input); if (result.paid) { await finish(result.receipt); throw new Error('This order has already been paid.'); } return result.orderID; } catch(cause) { setBusy(false); throw cause; } },
        onApprove:async ({orderID}) => { setBusy(true); try { if (!pending.current) throw new Error('Payment session expired. Refresh and try again.'); const result = await api('/paypal/capture',{...pending.current,orderID}); if (!result.paid) throw new Error('Payment is not confirmed. Please retry.'); await finish(result.receipt); } catch(cause) { setError(cause instanceof Error ? cause.message : 'Payment could not be confirmed. Please retry.'); } finally { setBusy(false); } },
        onCancel:() => { setBusy(false); setError('Payment cancelled. You can try again when ready.'); },
        onError:(cause) => { setBusy(false); if (!finished.current) setError(cause instanceof Error ? cause.message : 'PayPal could not complete checkout. Please retry.'); },
      });
      await buttons.render(container.current);
      if (!active) { await buttons.close(); return; }
      setLoading(false);
    })().catch(cause => { if (active) { setError(cause instanceof Error ? cause.message : 'PayPal is unavailable.'); setLoading(false); } });
    return () => { active = false; void buttons?.close().catch(()=>{}); };
    // The parent keys this component by the complete checkout snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[enabled]);
  return <div className="paypal-checkout">{!enabled ? <><button disabled type="button">Pay with PayPal</button><p>Online ordering is currently unavailable.</p></> : <>{loading && <p role="status">Loading PayPal…</p>}{busy && <p role="status">Processing payment. Please keep this page open.</p>}<div ref={container} />{mode === 'sandbox' && <p className="muted">PayPal sandbox · test payments only</p>}</>}{error && <p role="alert">{error}</p>}</div>;
}
