// Calendar days in the shopper's local time, including month/year boundaries.
export function deliveryEstimate(today: Date): string {
  const start = new Date(today);
  const end = new Date(today);
  start.setDate(start.getDate() + 10);
  end.setDate(end.getDate() + 15);
  const format = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
    ? `${format(start)}–${end.getDate()}`
    : `${format(start)}–${format(end)}`;
}
