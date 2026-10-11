export default function PaymentTrust({ etsyUrl, pinterestUrl }: { etsyUrl?: string; pinterestUrl?: string }) {
  return <section className="payment-trust find-us-bar" aria-labelledby="our-visibility-heading">
    <h2 id="our-visibility-heading">Our visibility</h2>
    <div className="payment-trust-badge">
      <span className="payment-trust-etsy" aria-hidden="true">Etsy</span>
      <div><h3>Find us on Etsy</h3><p>Explore GiftsByArtisans on the Etsy marketplace.</p>
        {etsyUrl && <a className="payment-trust-shop-link" href={etsyUrl}>Visit our Etsy shop →</a>}
      </div>
    </div>
    <div className="payment-trust-badge">
      <span className="payment-trust-pinterest" aria-hidden="true"><svg width="44" height="44" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="12" fill="currentColor" />
        <path fill="#fff" d="M12.5 4.5c-4.1 0-6.5 2.9-6.5 6.1 0 1.5.6 2.9 1.8 3.4.2.1.4 0 .4-.2l.3-1.1c0-.2 0-.3-.1-.4-.4-.5-.7-1.1-.7-2 0-2.4 1.8-4.4 4.6-4.4 2.5 0 3.9 1.5 3.9 3.6 0 2.7-1.2 5-3 5-1 0-1.8-.8-1.5-1.8.3-1.2.8-2.5.8-3.4 0-.8-.4-1.4-1.3-1.4-1 0-1.8 1-1.8 2.4 0 .9.3 1.5.3 1.5l-1.2 5.1c-.2 1-.3 2-.2 2.9l.2 2.2 1.1-1.9c.5-.8 1-1.8 1.2-2.7l.6-2.4c.4.7 1.3 1.2 2.3 1.2 3 0 5.1-2.7 5.1-6.4 0-2.9-2.3-5.3-5.3-5.3Z" />
      </svg></span>
      <div><h3>Find us on Pinterest</h3><p>Discover handmade products and inspiration.</p>
        {pinterestUrl && <a className="payment-trust-shop-link" href={pinterestUrl}>Visit our Pinterest →</a>}
      </div>
    </div>
  </section>;
}
