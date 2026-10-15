export const orderProgress = ['new', 'buyer_discussion', 'in_progress', 'completed'] as const;
export type OrderProgress = typeof orderProgress[number];
export const progressLabel: Record<OrderProgress, string> = { new: 'New', buyer_discussion: 'Buyer Discussion', in_progress: 'In Progress', completed: 'Completed' };
export function orderUpdate(input: unknown) {
  const value = input as { progress?: unknown; shipBy?: unknown };
  if (!value || !orderProgress.includes(value.progress as OrderProgress)) throw new Error('Choose a valid order progress.');
  if (value.shipBy !== undefined && value.shipBy !== null && (typeof value.shipBy !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.shipBy) || !Number.isFinite(Date.parse(value.shipBy)) || new Date(value.shipBy).toISOString().slice(0,10) !== value.shipBy)) throw new Error('Choose a valid ship-by date.');
  return { progress: value.progress as OrderProgress, shipBy: value.shipBy as string | null | undefined };
}
export function matchesShipDate(shipBy: string | null | undefined, filter: string, today: string) {
  if (filter === 'all') return true;
  if (!shipBy) return filter === 'none';
  const days = Math.round((Date.parse(shipBy) - Date.parse(today)) / 86400000);
  return filter === 'overdue' ? days < 0 : filter === 'today' ? days === 0 : filter === 'tomorrow' ? days === 1 : filter === 'week' ? days >= 0 && days <= 7 : false;
}
