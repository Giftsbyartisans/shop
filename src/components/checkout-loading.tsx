export default function CheckoutLoading({ header = false }: { header?: boolean }) {
  return <div aria-busy="true" role="status" aria-label="Loading checkout">
    {header && <div className="checkout-loading-header" aria-hidden="true"><div className="shimmer skeleton-brand" /><div className="shimmer skeleton-search" /></div>}
    <main className="shop checkout-page">
      <h1>Checkout</h1>
      <div className="checkout-layout" aria-hidden="true">
        <div className="checkout-loading-panel"><div className="shimmer skeleton-heading" /><div className="shimmer checkout-loading-field" /><div className="shimmer checkout-loading-address" /><div className="shimmer checkout-loading-field" /></div>
        <div className="checkout-loading-panel"><div className="shimmer skeleton-heading" /><div className="shimmer checkout-loading-address" /><div className="shimmer skeleton-line" /><div className="shimmer skeleton-line short" /></div>
      </div>
    </main>
  </div>;
}
