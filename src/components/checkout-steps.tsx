import Link from "next/link";
export default function CheckoutSteps({ step }: { step: "cart" | "address" | "payment" }) {
  const steps = [{ id: "cart", label: "Cart", href: "/cart" }, { id: "address", label: "Shipping address", href: "/checkout/address" }, { id: "payment", label: "Payment", href: "/checkout/payment" }] as const;
  const active = steps.findIndex(item => item.id === step);
  return <nav aria-label="Checkout steps" className="checkout-steps"><ol>{steps.map((item, index) => <li key={item.id} aria-current={item.id === step ? "step" : undefined} className={index <= active ? "active" : ""}>
    <span className="checkout-step-number">{index + 1}</span>{index < active ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
  </li>)}</ol></nav>;
}
