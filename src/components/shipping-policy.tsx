import Link from "next/link";
import type { ShopContent } from "@/lib/content";
import { policyBody } from "@/lib/policy-text";

export default function ShippingPolicy({ content }: { content: ShopContent }) {
  const policies = content.policies.filter(policy => ["delivery", "returns"].includes(policy.id));
  return (
    <details className="product-description product-shipping-policy">
      <summary>Shipping &amp; returns</summary>
      {policies.map(policy => <section key={policy.id}>
        <p className="pre-wrap">{policyBody(policy.title, policy.text)}</p>
      </section>)}
      {!policies.length && <p><Link href="/contact">Contact us</Link> for shipping and return information before purchasing.</p>}
    </details>
  );
}
