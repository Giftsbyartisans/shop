"use client";
import { useEffect,useState } from 'react';
import { backendApiUrl } from '@/lib/backend-api';
export function useCartPlacement(cartId:string|null,enabled:boolean) {
  const [result,setResult]=useState<{id:string|null;checking:boolean;placed:boolean;error:string}>({id:null,checking:true,placed:false,error:''});
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    if(!enabled||!cartId)return;
    const controller=new AbortController();
    setResult({id:cartId,checking:true,placed:false,error:''});
    void Promise.resolve().then(()=>fetch(backendApiUrl('/cart/status'),{method:'POST',headers:{'Content-Type':'application/json','X-PayPal-Mode':process.env.NODE_ENV==='production'?'live':'sandbox'},body:JSON.stringify({cartId}),signal:controller.signal}))
      .then(async response=>{const data=await response.json();if(!response.ok||typeof data.placed!=='boolean')throw new Error(data.error||'Could not check whether this cart was placed.');if(!controller.signal.aborted)setResult({id:cartId,checking:false,placed:data.placed,error:''});})
      .catch(cause=>{if(!controller.signal.aborted)setResult({id:cartId,checking:false,placed:false,error:cause instanceof Error?cause.message:'Could not check cart status.'});}).finally(()=>window.clearTimeout(timeout));
    const timeout=window.setTimeout(()=>{controller.abort();setResult({id:cartId,checking:false,placed:false,error:'Cart status check timed out. Please retry.'});},15000);
    return()=>{window.clearTimeout(timeout);controller.abort();};
  },[cartId,enabled,revision]);
  return {checking:enabled&&(!cartId||result.id!==cartId||result.checking),placed:enabled&&result.id===cartId&&result.placed,error:enabled&&result.id===cartId?result.error:'',retry:()=>setRevision(value=>value+1)};
}
