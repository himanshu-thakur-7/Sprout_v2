import { addDays, dayKey, parseDay, weekday, weekStart, type DayKey } from './dates';
import type { Habit, State } from './types';

// Pure habit logic: targets, what's due, streaks, slips, shields and stats.

/** Daily target: 1 for day/week habits; the reminder count for "throughout the day". */
export function target(h: Habit): number {
  if (h.schedule.kind !== 'thru') return 1;
  const { startHour, endHour, intervalHours } = h.schedule;
  return Math.floor((endHour - startHour) / intervalHours) + 1;
}

export const count = (s: State, h: Habit, d: DayKey) => s.logs[d]?.[h.id]?.n ?? 0;
export const isDone = (s: State, h: Habit, d: DayKey) => count(s, h, d) >= target(h);
export const isShielded = (s: State, h: Habit, period: DayKey) => s.shielded.includes(`${h.id}:${period}`);

/** Whether a day-kind habit is planned on this weekday. Throughout-the-day and weekly habits can happen any day. */
export const isPlannedDay = (h: Habit, d: DayKey) => (h.schedule.kind === 'day' ? !!h.schedule.days[weekday(d)] : true);

export const isWeekly = (h: Habit) => h.schedule.kind === 'week';
export const perWeek = (h: Habit) => (h.schedule.kind === 'week' ? h.schedule.perWeek : 7);

/** Done days in the week containing d, counting only days up to and including `upto`. */
export function weekCount(s: State, h: Habit, d: DayKey, upto: DayKey = addDays(weekStart(d), 6)): number {
  const ws = weekStart(d);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const k = addDays(ws, i);
    if (k > upto) break;
    if (isDone(s, h, k)) n++;
  }
  return n;
}

export const weekMet = (s: State, h: Habit, ws: DayKey) => weekCount(s, h, ws) >= perWeek(h);

/**
 * - due: a planned daily habit not done yet
 * - progress: a counter under way, or a weekly habit whose week is at risk
 * - open: a weekly habit that's on track; it can be logged but isn't due today
 * - rest: not planned today (or the week's already met)
 */
export type DayStatus = 'due' | 'progress' | 'done' | 'rest' | 'open';

/** Sessions a weekly habit still needs this week, counting only days before d. */
export function weekNeed(s: State, h: Habit, d: DayKey): number {
  return perWeek(h) - weekCount(s, h, d, addDays(d, -1));
}

/** A weekly habit is at risk when the sessions still needed fill every day left in the week (today included). */
export const weekAtRisk = (s: State, h: Habit, d: DayKey) => isWeekly(h) && weekNeed(s, h, d) >= 7 - weekday(d);

/** A habit's state on a given day, judged only by what was logged up to that day. */
export function statusOn(s: State, h: Habit, d: DayKey): DayStatus {
  if (isDone(s, h, d)) return 'done';
  if (h.schedule.kind === 'day') return isPlannedDay(h, d) ? 'due' : 'rest';
  if (h.schedule.kind === 'week') {
    if (weekNeed(s, h, d) <= 0) return 'rest';
    return weekAtRisk(s, h, d) ? 'progress' : 'open';
  }
  return 'progress';
}

export const isArchived = (h: Habit, d: DayKey) => (h.archivedAt ? d >= h.archivedAt : !!h.archived);
export const isLive = (h: Habit, d: DayKey) => h.createdAt <= d && !isArchived(h, d);
export const liveHabits = (s: State, d: DayKey) => s.habits.filter(h => isLive(h, d));

export function isPausedOn(h: Habit, d: DayKey): boolean {
  if (h.pauses?.length) return h.pauses.some(p => p.from <= d && (!p.to || d < p.to));
  return !!h.paused;
}
export const openPause = (h: Habit) => h.pauses?.find(p => !p.to);

/** Habits that count toward the day's badge and perfect day: live, not paused, and actually due (or done). */
export function dueOn(s: State, d: DayKey) {
  return liveHabits(s, d).filter(h => !isPausedOn(h, d) && ['due', 'progress', 'done'].includes(statusOn(s, h, d)));
}

export function isPerfectDay(s: State, d: DayKey): boolean {
  const due = dueOn(s, d);
  return due.length > 0 && due.every(h => isDone(s, h, d));
}

// ---------- Streaks ----------

export type StreakUnit = 'days' | 'weeks';
export const streakUnit = (h: Habit): StreakUnit => (isWeekly(h) ? 'weeks' : 'days');

/**
 * Current streak as of `today`. Today counts once it's done, but an unfinished
 * today never breaks it. Rest days are skipped; shielded periods hold the streak without adding to it.
 */
export function currentStreak(s: State, h: Habit, today: DayKey): number {
  if (isWeekly(h)) {
    const ws = weekStart(today);
    return (weekMet(s, h, ws) ? 1 : 0) + weeklyRunEndingAt(s, h, addDays(ws, -7));
  }
  return (isPlannedDay(h, today) && isDone(s, h, today) ? 1 : 0) + dailyRunEndingAt(s, h, addDays(today, -1));
}

function dailyRunEndingAt(s: State, h: Habit, from: DayKey): number {
  let n = 0;
  for (let d = from, i = 0; d >= h.createdAt && i < 3660; d = addDays(d, -1), i++) {
    if (!isPlannedDay(h, d) || isPausedOn(h, d)) continue;
    if (isDone(s, h, d)) n++;
    else if (!isShielded(s, h, d)) break;
  }
  return n;
}

function weeklyRunEndingAt(s: State, h: Habit, fromWeek: DayKey): number {
  const first = weekStart(h.createdAt);
  let n = 0;
  for (let w = fromWeek, i = 0; w >= first && i < 520; w = addDays(w, -7), i++) {
    if (weekPaused(h, w)) continue;
    if (weekMet(s, h, w)) n++;
    else if (!isShielded(s, h, w)) break;
  }
  return n;
}

/** Any paused day in a week excuses that week. */
const weekPaused = (h: Habit, ws: DayKey) => Array.from({ length: 7 }, (_, i) => addDays(ws, i)).some(d => isPausedOn(h, d));

export function bestStreak(s: State, h: Habit, today: DayKey): number {
  let best = 0, run = 0;
  if (isWeekly(h)) {
    for (let w = weekStart(h.createdAt); w <= today; w = addDays(w, 7)) {
      if (weekPaused(h, w) && !weekMet(s, h, w)) continue;
      if (weekMet(s, h, w)) best = Math.max(best, ++run);
      else if (!isShielded(s, h, w) && w !== weekStart(today)) run = 0;
    }
    return best;
  }
  for (let d = h.createdAt; d <= today; d = addDays(d, 1)) {
    if (!isPlannedDay(h, d) || isPausedOn(h, d)) continue;
    if (isDone(s, h, d)) best = Math.max(best, ++run);
    else if (!isShielded(s, h, d) && d !== today) run = 0;
  }
  return best;
}

// ---------- Slips & shields ----------

export type Slip = { habit: Habit; period: DayKey; key: string; lost: number; unit: StreakUnit };

/** The most recent period (yesterday, or last week for weekly habits) was missed with a live streak behind it. */
export function findSlip(s: State, h: Habit, today: DayKey): Slip | null {
  if (isPausedOn(h, today) || !isLive(h, today)) return null;
  let period: DayKey | null = null, lost = 0;
  if (isWeekly(h)) {
    const pw = addDays(weekStart(today), -7);
    if (pw < weekStart(h.createdAt) || weekPaused(h, pw) || weekMet(s, h, pw) || isShielded(s, h, pw)) return null;
    period = pw;
    lost = weeklyRunEndingAt(s, h, addDays(pw, -7));
  } else {
    let d = addDays(today, -1);
    for (let i = 0; i < 7 && !isPlannedDay(h, d); i++) d = addDays(d, -1);
    if (d < h.createdAt || !isPlannedDay(h, d) || isPausedOn(h, d) || isDone(s, h, d) || isShielded(s, h, d)) return null;
    period = d;
    lost = dailyRunEndingAt(s, h, addDays(d, -1));
  }
  const key = `${h.id}:${period}`;
  if (lost < 1 || s.dismissedSlips.includes(key)) return null;
  return { habit: h, period, key, lost, unit: streakUnit(h) };
}

export const SHIELD_EVERY = 14;

export function perfectDayCount(s: State, today: DayKey): number {
  const since = s.profile.since;
  if (!since) return 0;
  let n = 0;
  for (let d = since, i = 0; d <= today && i < 3660; d = addDays(d, 1), i++) if (isPerfectDay(s, d)) n++;
  return n;
}

/** Start with one shield, earn one every 14 perfect days. */
export function shieldInfo(s: State, perfect: number) {
  const earned = 1 + Math.floor(perfect / SHIELD_EVERY);
  return { ready: Math.max(0, earned - s.shielded.length), nextIn: SHIELD_EVERY - (perfect % SHIELD_EVERY) };
}

// ---------- Stats ----------

export function monthDays(year: number, month: number): DayKey[] {
  const n = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) => dayKey(new Date(year, month, i + 1)));
}

/** Share of due days (or weeks) hit this month so far, or null when nothing can be judged yet. Unfinished today isn't held against it. */
export function monthRate(s: State, h: Habit, today: DayKey): number | null {
  const t = parseDay(today);
  const days = monthDays(t.getFullYear(), t.getMonth()).filter(d => d <= today && d >= h.createdAt);
  if (isWeekly(h)) {
    const weeks = [...new Set(days.map(weekStart))];
    const judged = weeks.filter(w => addDays(w, 6) < today || weekMet(s, h, w));
    if (!judged.length) return null;
    return judged.filter(w => weekMet(s, h, w) || isShielded(s, h, w)).length / judged.length;
  }
  const judged = days.filter(d => isPlannedDay(h, d) && (d < today || isDone(s, h, d)));
  if (!judged.length) return null;
  return judged.filter(d => isDone(s, h, d) || isShielded(s, h, d)).length / judged.length;
}

export function totalDone(s: State, h: Habit): number {
  let n = 0;
  for (const day of Object.keys(s.logs)) {
    const e = s.logs[day][h.id];
    if (!e) continue;
    n += h.schedule.kind === 'thru' ? e.n : e.n >= target(h) ? 1 : 0;
  }
  return n;
}

/** Median time of day the habit gets done, in minutes. */
export function usualTime(s: State, h: Habit): number | null {
  const ts = Object.keys(s.logs).sort().slice(-60)
    .map(d => s.logs[d][h.id]).filter(e => e && e.n >= target(h)).map(e => e!.t).sort((a, b) => a - b);
  if (!ts.length) return null;
  return ts[Math.floor(ts.length / 2)];
}
