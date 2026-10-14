"use client";
import { useRouter } from "next/navigation";
export default function BuyNow({ enabled, ready }: { enabled: boolean; ready: boolean }) {
  const router = useRouter();
  return <div className="order-now"><button className="primary" type="button" disabled={!enabled || !ready} onClick={() => router.push("/checkout/address")}>Place order</button>{!enabled && <p className="muted">Online ordering is currently unavailable.</p>}</div>;
}
