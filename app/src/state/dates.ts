// Local-calendar date helpers. Days are 'YYYY-MM-DD' keys; weeks start on Monday.

export type DayKey = string;

export const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(k: DayKey): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(k: DayKey, n: number): DayKey {
  const d = parseDay(k);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** 0 = Monday … 6 = Sunday. */
export function weekday(k: DayKey): number {
  return (parseDay(k).getDay() + 6) % 7;
}

/** Monday of the week containing k. */
export function weekStart(k: DayKey): DayKey {
  return addDays(k, -weekday(k));
}

export function daysBetween(a: DayKey, b: DayKey): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400000);
}

export const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const weekdayName = (k: DayKey) => WEEKDAY_NAMES[weekday(k)];
export const monthName = (m: number) => MONTHS[m];

/** "Thursday, Sep 24" */
export function longDate(k: DayKey): string {
  const d = parseDay(k);
  return `${weekdayName(k)}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

/** "Sep 21 – 27" or "Sep 28 – Oct 4" */
export function weekRange(start: DayKey): string {
  const a = parseDay(start), b = parseDay(addDays(start, 6));
  const ma = MONTHS[a.getMonth()].slice(0, 3), mb = MONTHS[b.getMonth()].slice(0, 3);
  return ma === mb ? `${ma} ${a.getDate()} – ${b.getDate()}` : `${ma} ${a.getDate()} – ${mb} ${b.getDate()}`;
}

/** Minutes since midnight → "9:00 pm". */
export function clockLabel(min: number): string {
  const h = Math.floor(min / 60) % 24, m = min % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${h < 12 ? 'am' : 'pm'}`;
}

/** Hour → "8 am". */
export const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 || h === 24 ? 'am' : 'pm'}`;
