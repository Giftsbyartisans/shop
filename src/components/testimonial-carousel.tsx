"use client";
import { useEffect, useRef, useState } from 'react';
import type { ShopContent } from '@/lib/content';

export default function TestimonialCarousel({ reviews, intervalSeconds = 5 }: { reviews: ShopContent['reviews']; intervalSeconds?: number }) {
  const [index, setIndex] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (reviews.length < 2 || intervalSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setIndex(current => (current + 1) % reviews.length);
    }, intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [reviews.length, intervalSeconds]);
  if (!reviews.length) return null;
  const active = index % reviews.length;
  const move = (direction: number) => setIndex(current => (current % reviews.length + direction + reviews.length) % reviews.length);
  return <div className="customer-review-carousel" role="region" aria-label="Customer testimonials" aria-roledescription="carousel"
    onKeyDown={event => {
      if (event.target !== event.currentTarget || reviews.length < 2) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); }
    }} tabIndex={reviews.length > 1 ? 0 : undefined}>
    <div className="customer-review-cards"
      onTouchStart={event => { const point = event.touches[0]; touch.current = event.touches.length === 1 ? { x: point.clientX, y: point.clientY } : null; }}
      onTouchCancel={() => { touch.current = null; }}
      onTouchEnd={event => {
        const origin = touch.current; touch.current = null;
        const point = event.changedTouches[0];
        if (!origin || !point || reviews.length < 2) return;
        const dx = point.clientX - origin.x, dy = point.clientY - origin.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
      }}>
      {[-1, 0, 1].map(position => {
        if (position !== 0 && (reviews.length === 1 || (reviews.length === 2 && position === 1)))
          return <div className="customer-review-placeholder" key={position} aria-hidden="true" />;
        const review = reviews[(active + position + reviews.length) % reviews.length];
        return <figure key={position} className={`testimonial-card ${position === 0 ? 'featured' : 'side'}`}>
          <div className="stars" role="img" aria-label={`${review.rating} out of 5 stars`}>
            <span aria-hidden="true">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
          </div>
          <blockquote>{review.text}</blockquote>
          <figcaption>{review.name}</figcaption>
          {review.dateReviewed && <time dateTime={review.dateReviewed}>{review.dateReviewed}</time>}
        </figure>;
      })}
    </div>
    <span className="sr-only" aria-live="polite">Testimonial {active + 1} of {reviews.length}</span>
    {reviews.length > 1 && <div className="testimonial-controls">
      <button className="testimonial-arrow previous" type="button" aria-label="Previous testimonial" onClick={() => move(-1)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg></button>
      <button className="testimonial-arrow next" type="button" aria-label="Next testimonial" onClick={() => move(1)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg></button>
    </div>}
  </div>;
}
