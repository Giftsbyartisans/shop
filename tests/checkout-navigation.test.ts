import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkoutRedirect, beginOrderConfirmation, endOrderConfirmation, pendingOrderConfirmation } from '../src/lib/checkout-navigation';
const ready = { ready:true,cartLoading:false,cartError:false,hasItems:true,payment:true,contactReady:true,contactError:false,validContact:true };
test('both checkout pages redirect empty carts only after hydration succeeds', () => {
  for(const payment of [true,false]) {
    assert.equal(checkoutRedirect({...ready,payment,hasItems:false}),'/');
    assert.equal(checkoutRedirect({...ready,payment,hasItems:false,cartLoading:true}),null);
    assert.equal(checkoutRedirect({...ready,payment,hasItems:false,cartError:true}),null);
  }
});
test('payment requires complete contact details and does not redirect during address loading or errors', () => {
  assert.equal(checkoutRedirect({...ready,validContact:false}),'/checkout/address');
  assert.equal(checkoutRedirect({...ready,validContact:false,contactReady:false}),null);
  assert.equal(checkoutRedirect({...ready,validContact:false,contactError:true}),null);
  assert.equal(checkoutRedirect({...ready,validContact:false,payment:false}),null);
  assert.equal(checkoutRedirect(ready),null);
});
test('payment confirmation takes precedence over clearing the cart; later checkout visits go home', () => {
  const target=beginOrderConfirmation('order-id');
  assert.equal(checkoutRedirect({...ready,hasItems:false},pendingOrderConfirmation()),target);
  endOrderConfirmation();
  assert.equal(checkoutRedirect({...ready,hasItems:false},pendingOrderConfirmation()),'/');
});
test('already-placed carts go home even when stale products are still in the browser',()=>{
 assert.equal(checkoutRedirect({...ready,placed:true}),'/');
 assert.equal(checkoutRedirect({...ready,payment:false,placed:true}),'/');
 assert.equal(checkoutRedirect({...ready,placed:true},'/order-confirmation/paid-order'),'/order-confirmation/paid-order');
});
