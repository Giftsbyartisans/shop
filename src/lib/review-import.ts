import type { ShopContent } from './content';
type Review = ShopContent['reviews'][number];
function reviewDate(value: unknown, row: number): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`Review ${row}: invalid date.`);
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = match ? `${match[3]}-${match[1]}-${match[2]}` : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isFinite(Date.parse(iso)) || new Date(iso).toISOString().slice(0, 10) !== iso)
    throw new Error(`Review ${row}: invalid date.`);
  return iso;
}
export async function importReviews(text: string, existing: Review[] = []): Promise<Review[]> {
  const data = JSON.parse(text);
  const rows = Array.isArray(data) ? data : data?.reviews;
  if (!Array.isArray(rows) || !rows.length || rows.length > 50) throw new Error('Choose a JSON file containing 1–50 reviews.');
  const result: Review[] = [];
  const duplicateKey = (name: string, date: string | undefined, rating: number, message: string) =>
    JSON.stringify([name.trim().toLocaleLowerCase(), date ?? '', rating, message.trim()]);
  const seen = new Set(existing.map(review => duplicateKey(review.name, review.dateReviewed, review.rating, review.text)));
  for (const [index, row] of rows.entries()) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`Review ${index + 1}: invalid review.`);
    const name = row.reviewer ?? row.name;
    const body = row.message ?? row.text;
    const rating = Number(row.star_rating ?? row.rating);
    if (typeof name !== 'string' || !name.trim() || typeof body !== 'string' || !body.trim() || !Number.isInteger(rating) || rating < 1 || rating > 5)
      throw new Error(`Review ${index + 1}: enter a name, message, and rating from 1–5.`);
    const dateReviewed = reviewDate(row.date_reviewed ?? row.dateReviewed, index + 1);
    const key = duplicateKey(name, dateReviewed, rating, body);
    if (seen.has(key)) continue;
    if (row.id !== undefined && (typeof row.id !== 'string' || !row.id.trim())) throw new Error(`Review ${index + 1}: invalid ID.`);
    // Stable, opaque IDs make reimports update existing reviews without exposing order IDs.
    const identity = row.order_id !== undefined ? ['order', String(row.order_id), body.trim()] : [name.trim(), body.trim(), dateReviewed ?? '', rating];
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(identity)));
    let id = row.id ?? `review-${Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('')}`;
    if ([...existing, ...result].some(review => review.id === id)) {
      const distinct = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([id, key])));
      id = `review-${Array.from(new Uint8Array(distinct), b => b.toString(16).padStart(2, '0')).join('')}`;
    }
    seen.add(key);
    result.push({ id, name: name.trim(), text: body.trim(), rating, ...(dateReviewed ? { dateReviewed } : {}) });
  }
  return result;
}
export function exportReviews(reviews: Review[]): string {
  return JSON.stringify(reviews.map(review => ({ id: review.id, reviewer: review.name, date_reviewed: review.dateReviewed ?? '', star_rating: review.rating, message: review.text })), null, 2);
}
