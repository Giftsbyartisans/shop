import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextCartId,validCartId } from '../src/lib/cart-identity';
import { parseShopping } from '../src/lib/shopping';
const first='a7420300-90a4-4eea-a443-fbc8b20b11dd', next='b7420300-90a4-4eea-a443-fbc8b20b11dd';
test('cart identity survives storage reloads and unchanged or reordered contents',()=>{
 const items=[{id:'a',quantity:1},{id:'b',quantity:2}];
 const saved=parseShopping(JSON.stringify({cartId:first,cart:items,favorites:[]}));
 assert.equal(nextCartId(saved.cartId,items,[...items].reverse(),()=>next),first);
 assert.equal(validCartId(saved.cartId),true);
});
test('edits, clearing purchased items, and invalid legacy identities get a fresh cart ID',()=>{
 const items=[{id:'a',quantity:1}];
 assert.equal(nextCartId(first,items,[{id:'a',quantity:2}],()=>next),next);
 assert.equal(nextCartId(first,items,[],()=>next),next);
 assert.equal(nextCartId(null,items,items,()=>next),next);
 assert.equal(validCartId('invalid'),false);
});
