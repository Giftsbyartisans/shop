"use client";
import { useEffect, useState } from 'react';
import { checkoutEmail } from '@/lib/checkout-contact';
import { backendApiUrl } from '@/lib/backend-api';

type Check = { email: string; revision: number; status: 'available' | 'registered' | 'error'; error: string };
export function useGuestCheckoutEmail(value: string, enabled: boolean) {
  let email = '';
  try { email = checkoutEmail(value); } catch { /* Wait for a valid email. */ }
  const [result, setResult] = useState<Check | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled || !email) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(backendApiUrl('/checkout/email'), {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
          });
          const data = await response.json();
          if (!response.ok || typeof data.registered !== 'boolean') throw new Error('Could not check your email. Please try again.');
          if (!controller.signal.aborted) setResult({ email, revision, status: data.registered ? 'registered' : 'available', error: '' });
        } catch {
          if (!controller.signal.aborted) setResult({ email, revision, status: 'error', error: 'Could not check your email. Please try again.' });
        }
      })();
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [email, enabled, revision]);
  const current = result?.email === email && result.revision === revision ? result : null;
  return { status: !enabled || !email ? 'idle' : current?.status ?? 'checking', error: current?.error ?? '', retry: () => setRevision(number => number + 1) };
}
