export default function ShopSkeleton({ variant = "collection" }: { variant?: "collection" | "product" | "home" }) {
  return <div className={`shop loading-skeleton loading-skeleton-${variant}`} role="status" aria-label="Loading content" aria-busy="true">
    <div aria-hidden="true">
      {variant === "home" && <div className="shimmer skeleton-banner" />}
      {variant === "product" ? <div className="skeleton-product-layout">
        <div className="shimmer skeleton-photo" />
        <div><div className="shimmer skeleton-title" /><div className="shimmer skeleton-line" /><div className="shimmer skeleton-line short" /><div className="shimmer skeleton-description" /></div>
      </div> : <><div className="shimmer skeleton-title" /><div className="skeleton-card-grid">
        {Array.from({ length: 8 }, (_, i) => <div key={i}><div className="shimmer skeleton-photo" /><div className="shimmer skeleton-line" /><div className="shimmer skeleton-line short" /></div>)}
      </div></>}
    </div>
  </div>;
}
