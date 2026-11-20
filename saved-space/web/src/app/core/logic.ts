import { Item, Subtask } from './models';

/** Splits pasted text into one subtask per non-empty line, removing list marks such as "-", "*", "1." and "[ ]". */
export function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])?\s*(?:\[[ xX]?\]\s*)?/, '').trim())
    .filter((l) => l.length > 0)
    .map((l) => l.slice(0, 1000));
}

/** New order after moving one entry up or down. Returns the list unchanged at the ends. */
export function moved<T extends { id: string }>(list: T[], id: string, dir: -1 | 1): T[] {
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const copy = [...list];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

export function progress(subs: Subtask[]): { done: number; total: number } {
  return { done: subs.filter((s) => s.done).length, total: subs.length };
}

export function matchesSearch(item: Item, subs: Subtask[], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.title, item.note ?? '', item.url ?? '', ...subs.map((s) => s.text)].some((t) => t.toLowerCase().includes(q));
}

export function statusPatch(status: Item['status'], now = new Date()): Pick<Item, 'status' | 'done_at'> {
  return { status, done_at: status === 'done' ? now.toISOString() : null };
}
