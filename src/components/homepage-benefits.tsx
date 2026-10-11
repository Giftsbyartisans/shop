const benefits = [
  { title: "Free worldwide delivery", text: "Free delivery guaranteed worldwide.", path: "M3 6h11v11H3zM14 10h4l3 4v3h-7M7 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4M17 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4" },
  { title: "5-star reviews", text: "Thoughtful products. Happy customers.", path: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" },
  { title: "30-day returns", text: "Returns and exchanges made simple.", path: "M9 8 4 13l5 5M4 13h11a5 5 0 0 0 0-10h-2" },
  { title: "Customer-loved", text: "Your happiness is our priority.", path: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" },
];
export default function HomepageBenefits() {
  return <div className="homepage-benefits-bar"><section className="homepage-benefits" aria-label="Why shop with us">
    {benefits.map(benefit => <div className="homepage-benefit" key={benefit.title}>
      <span className="payment-trust-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={benefit.path} /></svg></span>
      <div><h3>{benefit.title}</h3><p>{benefit.text}</p></div>
    </div>)}
  </section></div>;
}
