"use client";
import { useEffect, useState } from "react";
import { deliveryEstimate } from "@/lib/delivery-estimate";

export default function ShippingPolicy() {
  const [estimate, setEstimate] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setEstimate(deliveryEstimate(new Date()));
    const timer = window.setTimeout(update, 0);
    const refresh = window.setInterval(update, 60000);
    return () => { window.clearTimeout(timer); window.clearInterval(refresh); };
  }, []);
  return (
    <details className="product-description product-shipping-policy">
      <summary>Shipping &amp; returns</summary>
      <ul>
        <li>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v16H3V5a2 2 0 0 1 2-2Zm0 6v10h14V9H5Z" fill="currentColor"/><path d="M7 2v4M17 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <span>{estimate ? <>Order today for estimated delivery by <span className="policy-emphasis">{estimate}</span></> : "Estimated delivery in 10–15 days"}</span>
        </li>
        <li>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 2h14a2 2 0 0 1 2 2v18H3V4a2 2 0 0 1 2-2Zm4 0v9l3-2 3 2V2H9Z"/><path d="M15 15H8m0 0 3-3m-3 3 3 3" fill="none" stroke="var(--background)" strokeWidth="1.8"/></svg>
          <span className="policy-emphasis">Returns &amp; exchanges accepted within 30 days</span>
        </li>
        <li>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5h12v12H2zM14 9h4l4 4v4h-8z" fill="currentColor"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="18" cy="18" r="3" fill="currentColor"/><path d="M16 11h2l2 2h-4z" fill="var(--background)"/></svg>
          <span>Free shipping</span>
        </li>
      </ul>
      <p className="muted">Standard delivery takes 10–15 days. Dates are estimates.</p>
    </details>
  );
}
