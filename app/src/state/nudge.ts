import { addDays, weekday, type DayKey } from './dates';
import { count, currentStreak, dueOn, isDone, isWeekly, target, weekCount } from './logic';
import type { Habit, State } from './types';

const NUDGE_HOUR = 20;
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/**
 * One gentle evening nudge (8 pm) when a streak is at risk: the unfinished
 * habit due today with the longest streak behind it. Null when nothing is at risk.
 */
export function eveningNudge(s: State, today: DayKey, now: Date): { title: string; body: string; date: Date } | null {
  const at = new Date(now);
  at.setHours(NUDGE_HOUR, 0, 0, 0);
  if (now >= at) return null;
  const risky = dueOn(s, today)
    .filter(h => !isDone(s, h, today))
    .map(h => ({ h, n: currentStreak(s, h, today) }))
    .filter(({ h, n }) => n >= 2 && (!isWeekly(h) || weekAtRisk(s, h, today)))
    .sort((a, b) => b.n - a.n)[0];
  if (!risky) return null;
  const { h, n } = risky;
  const unit = isWeekly(h) ? 'week' : 'day';
  let body = `${h.name} is still waiting. Two minutes counts.`;
  if (h.schedule.kind === 'thru') {
    const left = target(h) - count(s, h, today);
    body = `${WORDS[left] ?? left} ${left === 1 ? singular(h.unit ?? 'time') : h.unit ?? 'times'} to go before bed. Small sips count.`;
  } else if (isWeekly(h)) {
    body = `One ${h.name.toLowerCase()} today keeps this week on track.`;
  }
  return { title: `Still time to keep your ${n}-${unit} streak alive 🔥`, body, date: at };
}

/** A weekly habit is at risk when the sessions still needed fill every day left in the week. */
function weekAtRisk(s: State, h: Habit, today: DayKey): boolean {
  if (h.schedule.kind !== 'week') return false;
  const need = h.schedule.perWeek - weekCount(s, h, today, addDays(today, -1));
  return need >= 7 - weekday(today);
}


const singular = (w: string) => (w.endsWith('sses') ? w.slice(0, -2) : w.endsWith('s') ? w.slice(0, -1) : w);
