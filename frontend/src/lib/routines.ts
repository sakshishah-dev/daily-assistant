import type { Reminder, RepeatType } from '../types';

/**
 * Routines: a named group of reminders with its own time and ONE notification / check-in.
 * A routine is not a table of its own: it is a set of normal exact-time reminders (slots [], customTime = routine time)
 * that share routineId + routineName. Dose logs stay `<reminderId>__custom__<date>`, so scores, stock, the doctor
 * report and family sharing work unchanged. Only the grouping differs (Today, check-in, notifications, snooze).
 */
export interface Routine {
  id: string;
  name: string;
  time: string;                 // HH:mm
  repeat: RepeatType;
  repeatDays?: number[];
  isActive: boolean;
  remindAgain?: { every: number; times: number };
  createdAt: string;
  items: Reminder[];            // in routine order
}

export const ROUTINE_PREFIX = 'routine-';
/** Check-in / snooze / notification key for a routine. */
export const routineKey = (routineId: string) => `${ROUTINE_PREFIX}${routineId}`;
export const routineIdFromKey = (key: string) => (key.startsWith(ROUTINE_PREFIX) ? key.slice(ROUTINE_PREFIX.length) : null);

export const newRoutineId = () => `rt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const byOrder = (a: Reminder, b: Reminder) =>
  (a.routineOrder ?? 0) - (b.routineOrder ?? 0) || a.createdAt.localeCompare(b.createdAt);

/** The members of one routine, in order. */
export const routineItems = (reminders: Reminder[], routineId: string) =>
  reminders.filter(r => r.routineId === routineId).sort(byOrder);

/** All routines found in a list of reminders. Time, repeat and name come from the first item (all items share them). */
export function routinesOf(reminders: Reminder[]): Routine[] {
  const ids = [...new Set(reminders.filter(r => r.routineId).map(r => r.routineId!))];
  return ids.map(id => {
    const items = routineItems(reminders, id);
    const first = items[0];
    return {
      id, name: first.routineName || '', time: first.customTime ?? '07:00', repeat: first.repeat, repeatDays: first.repeatDays,
      isActive: items.some(r => r.isActive), remindAgain: first.remindAgain,
      createdAt: items.map(r => r.createdAt).sort()[0], items,
    };
  }).sort((a, b) => a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt));
}
