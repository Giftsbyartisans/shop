"use client";
import { useRef, useState } from 'react';
import type { ShopContent } from '@/lib/content';
import { exportReviews, importReviews } from '@/lib/review-import';
export default function ReviewTransfer({ reviews, onChange }: { reviews: ShopContent['reviews']; onChange: (reviews: ShopContent['reviews']) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return <section className="manager-review-transfer">
    <h2>Testimonial import &amp; export</h2>
    <p className="manager-help">Import reviews JSON, then edit reviews in Testimonials. Save website changes to publish them.</p>
    <div className="manager-listing-tools">
      <button type="button" disabled={busy} onClick={() => file.current?.click()}>Import testimonials</button>
      <button type="button" disabled={busy || !reviews.length} onClick={() => {
        const url = URL.createObjectURL(new Blob([exportReviews(reviews)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = 'reviews.json'; link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}>Export testimonials</button>
    </div>
    <input ref={file} type="file" hidden accept=".json,application/json" onChange={async event => {
      const input = event.currentTarget;
      const selected = input.files?.[0]; if (!selected) return;
      setBusy(true); setMessage('Reading reviews…');
      try {
        if (selected.size > 2 * 1024 * 1024) throw new Error('Review files must be under 2 MB.');
        const text = await selected.text();
        const imported = await importReviews(text, reviews);
        const data = JSON.parse(text);
        const skipped = (Array.isArray(data) ? data : data.reviews).length - imported.length;
        const merged = new Map(reviews.map(review => [review.id, review]));
        imported.forEach(review => merged.set(review.id, review));
        if (merged.size > 50) throw new Error('Your shop can have up to 50 testimonials. Remove some before importing.');
        if (imported.length) onChange([...merged.values()]);
        setMessage(`${imported.length} testimonials imported; ${skipped} duplicates skipped.${imported.length ? ' Edit them in Testimonials, then save website changes.' : ''}`);
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Import failed.'); }
      finally { input.value = ''; setBusy(false); }
    }} />
    {message && <p className="manager-help" role="status">{message}</p>}
  </section>;
}
