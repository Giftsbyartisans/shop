"use client";
import { useEffect, useState } from "react";
import { backendApiUrl } from "@/lib/backend-api";
import type { CartTotals } from "@/lib/cart-totals";
import type { CartItem } from "@/lib/shopping";
export function useCartTotals(items: CartItem[], ready: boolean, revisionKey: string) {
  const key = JSON.stringify({ items, revisionKey });
  const [saved, setSaved] = useState<{ key: string; totals: CartTotals } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!ready || !items.length) return;
    const controller = new AbortController();
    setError("");
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(backendApiUrl("/cart"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: JSON.parse(key).items }), signal: controller.signal });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Could not load cart prices.");
          if (!controller.signal.aborted) setSaved({ key, totals: result });
        } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load cart prices."); }
      })();
    }, 150);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, ready]);
  return { totals: saved?.key === key ? saved.totals : null, error };
}
