const benefits = [
  { title: 'Free shipping', text: 'A little extra care, at no extra cost.', path: 'M3 6h11v11H3zM14 10h4l3 4v3h-7M7 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4M17 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4' },
  { title: 'Direct from artisans', text: 'Handmade quality. Thoughtful value.', path: 'M3 11V4h7l11 11-7 7L3 11ZM7 8h.01' },
  { title: '30-day returns', text: 'Returns & exchanges made simple.', path: 'M9 8 4 13l5 5M4 13h11a5 5 0 0 0 0-10h-2' },
  { title: 'Customer-loved', text: 'Your happiness inspires our craft.', path: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z' },
];

export default function ProductBenefits() {
  return <section className="product-benefits" aria-label="Why shop with GiftsByArtisans">
    {benefits.map(benefit => <div className="product-benefit" key={benefit.title}>
      <span className="product-benefit-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={benefit.path} /></svg></span>
      <h3>{benefit.title}</h3>
      <p>{benefit.text}</p>
    </div>)}
  </section>;
}
