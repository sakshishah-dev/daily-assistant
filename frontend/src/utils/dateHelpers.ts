import { TIMEZONE } from './constants';
import type { TaskInstance } from '../types';
import { t, locale, shortMonth} from '../lib/i18n';

export function getTodayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

export function getCurrentHourIST(): number {
  return parseInt(
    new Date().toLocaleString('en-US', { timeZone: TIMEZONE, hour: 'numeric', hour12: false })
  );
}

export function getCurrentTimeIST(): string {
  const now = new Date();
  const h = now.toLocaleString('en-US', { timeZone: TIMEZONE, hour: '2-digit', hour12: false }).padStart(2, '0');
  const m = now.toLocaleString('en-US', { timeZone: TIMEZONE, minute: '2-digit' }).padStart(2, '0');
  return `${h}:${m}`;
}

export function getGreeting(): string {
  const hour = getCurrentHourIST();
  if (hour >= 5  && hour < 12) return t('Good Morning');
  if (hour >= 12 && hour < 17) return t('Good Afternoon');
  if (hour >= 17 && hour < 21) return t('Good Evening');
  return t('Good Night');
}

export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(locale(), {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

/** Reason stored when an item is left unticked at a check-in. */
export const MISSED = 'missed';
export const isMissed  = (t: TaskInstance) => t.status === 'skipped' && t.skippedReason === MISSED;
/** Deliberately skipped (not counted against you). Missed items DO count as not done. */
export const isExcused = (t: TaskInstance) => t.status === 'skipped' && t.skippedReason !== MISSED;

export function shouldReminderRunToday(
  reminder: { repeat: string; date?: string; repeatDays?: number[]; medicine?: { startDate?: string; endDate?: string } },
  today: string = getTodayIST(),
): boolean {
  const jsDay = new Date(today + 'T00:00:00Z').getUTCDay();
  const appDay = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon … 6=Sun
  // Course window (medicines): nothing before the start or after the end date.
  if (reminder.medicine?.startDate && today < reminder.medicine.startDate) return false;
  if (reminder.medicine?.endDate && today > reminder.medicine.endDate) return false;

  switch (reminder.repeat) {
    case 'daily':    return true;
    case 'once':     return reminder.date === today;
    case 'weekdays': return appDay < 5;
    case 'weekly':
    case 'custom':   return (reminder.repeatDays ?? []).includes(appDay);
    case 'monthly': {
      const day = new Date(today + 'T00:00:00').getDate();
      return (reminder.repeatDays ?? []).includes(day);
    }
    default: return true;
  }
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  const jsDay = new Date(year, month, 1).getDay();
  return jsDay === 0 ? 6 : jsDay - 1; // 0=Mon
}
