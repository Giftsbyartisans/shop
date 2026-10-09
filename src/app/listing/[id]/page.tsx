import {Suspense} from 'react';
import Storefront from '@/components/storefront';
export default function Page({params}:{params:Promise<{id:string}>}){return <Suspense fallback={<main className="shop collection"><p role="status">Loading gift…</p></main>}><Listing params={params}/></Suspense>}
async function Listing({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Storefront page="listing" id={id}/>}
