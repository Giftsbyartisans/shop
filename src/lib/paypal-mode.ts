import type { PayPalEnvironment } from './paypal-settings';

export function frontendPayPalMode(): PayPalEnvironment {
  const hostname = typeof window === 'undefined' ? '' : window.location.hostname;
  const local = hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
  return local || process.env.NODE_ENV !== 'production' ? 'sandbox' : 'live';
}
