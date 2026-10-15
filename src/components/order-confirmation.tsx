"use client";
import { endOrderConfirmation } from '@/lib/checkout-navigation';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { backendApiUrl } from '@/lib/backend-api';
import { loadOrder,type CustomerOrder } from '@/lib/customer-records';
import OrderDetail from './order-detail';
export default function OrderConfirmation({id}:{id:string}) {
  const [order,setOrder]=useState<CustomerOrder|null>(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;endOrderConfirmation();
    void(async()=>{
      if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('Order confirmation not found.');
      let saved;try{saved=JSON.parse(sessionStorage.getItem(`shop-order-confirmation:${id}`)||'null');}catch{/* Storage may be unavailable. */}
      let result:CustomerOrder;
      if(saved?.input){
        const session=await fetchAuthSession();const token=session.tokens?.accessToken.toString();
        const response=await fetch(backendApiUrl('/paypal/confirmation'),{method:'POST',headers:{'Content-Type':'application/json','X-PayPal-Mode':saved.mode==='sandbox'?'sandbox':'live',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(saved.input),signal:AbortSignal.timeout(20000)});
        const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not verify your order.');result=data.order;
      }else result=await loadOrder(id);
      if(result.id!==id||result.status!=='paid')throw new Error('Payment has not been confirmed for this order.');
      if(active)setOrder(result);
    })().catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Could not load your order.');});return()=>{active=false;};
  },[id]);
  if(order)return <OrderDetail id={id} initialOrder={order} guest confirmation />;
  return <main className="shop order-detail-page"><h1>Order confirmation</h1>{error?<><p role="alert">{error}</p><p>You can find your order through <Link href="/order-finder">Track order</Link> or your account.</p></>:<p role="status">Verifying payment and loading your order…</p>}<Link href="/">Back to home</Link></main>;
}
