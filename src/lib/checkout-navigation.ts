let confirmationPath: string | null = null;
export function beginOrderConfirmation(id: string) { confirmationPath = `/order-confirmation/${encodeURIComponent(id)}`; return confirmationPath; }
export function pendingOrderConfirmation() { return confirmationPath; }
export function endOrderConfirmation() { confirmationPath = null; }
export function checkoutRedirect(state: { ready: boolean; cartLoading: boolean; cartError: boolean; hasItems: boolean; placed?: boolean; payment: boolean; contactReady: boolean; contactError: boolean; validContact: boolean }, confirmation: string | null = null) {
  if (confirmation) return confirmation;
  if (!state.ready || state.cartLoading || state.cartError) return null;
  if (!state.hasItems || state.placed) return '/';
  if (state.payment && state.contactReady && !state.contactError && !state.validContact) return '/checkout/address';
  return null;
}
