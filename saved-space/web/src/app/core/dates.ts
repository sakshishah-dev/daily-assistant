/** Local calendar date as yyyy-mm-dd (not UTC, so late evening in India stays "today"). */
export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDate(new Date(y, m - 1, d + days));
}

/** Sunday that ends the current Monday to Sunday week. */
export function endOfWeek(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0 = Sunday
  return addDays(iso, dow === 0 ? 0 : 7 - dow);
}

/** "5 March 2026": full month name, always the same format. */
export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export type DueGroup = 'overdue' | 'today' | 'week' | 'later' | 'none';

export function dueGroup(due: string | null, today: string): DueGroup {
  if (!due) return 'none';
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  if (due <= endOfWeek(today)) return 'week';
  return 'later';
}
