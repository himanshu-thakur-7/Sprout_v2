import type { IconName } from '@/components/Icon';
import type { PipMood, PipProp } from '@/components/Pip';
import { addDays, weekday, weekStart, type DayKey } from './dates';
import { isDone, isPlannedDay, isShielded, isWeekly, liveHabits, perWeek, weekCount, weekMet } from './logic';
import type { Habit, State } from './types';

// The weekly recap: one story card per habit worth talking about, then a
// final card with the week's total. Each card is one huge number, one
// sentence and one Pip pose.

export type RecapKind = 'saved' | 'perfect' | 'streak' | 'steady' | 'love';

export type RecapCard = {
  habit: Habit;
  kind: RecapKind;
  /** The huge thing: "7/7", "9 weeks", "Saved". */
  big: string;
  bigIcon?: IconName;
  line: string;
  pill?: string;
  mood: PipMood;
  prop: PipProp;
};

export type Recap = { week: DayKey; cards: RecapCard[]; kept: number };

/** The week a recap covers: this week on Sunday, otherwise last week. */
export function recapWeek(today: DayKey): DayKey {
  return weekday(today) === 6 ? weekStart(today) : addDays(weekStart(today), -7);
}

/** Recaps are offered from Sunday through Wednesday. */
export const recapOffered = (today: DayKey) => weekday(today) === 6 || weekday(today) <= 2;

const PROP_FOR: Partial<Record<IconName, PipProp>> = { book: 'book', dumbbell: 'dumbbells', lotus: 'meditate', shoe: 'sneakers' };

const EVERY_DAY: Partial<Record<IconName, string>> = {
  book: 'You read every day this week.',
  dumbbell: 'You trained every day this week.',
  lotus: 'You meditated every day this week.',
  shoe: 'You walked every day this week.',
  drop: 'You drank your water every day this week.',
  moon: 'You slept on time every day this week.',
  apple: 'You ate well every day this week.',
};

const ORDER: RecapKind[] = ['saved', 'perfect', 'streak', 'steady', 'love'];

export function buildRecap(s: State, today: DayKey, week = recapWeek(today)): Recap | null {
  const end = addDays(week, 6);
  const last = end < today ? end : today;
  const habits = liveHabits(s, last).filter(h => h.createdAt <= last);
  if (!habits.length) return null;

  let kept = 0;
  const cards: RecapCard[] = [];
  for (const h of habits) {
    const lower = h.name.toLowerCase();
    const prop = PROP_FOR[h.icon] ?? 'none';

    if (isWeekly(h)) {
      const n = weekCount(s, h, week);
      kept += n;
      if (isShielded(s, h, week)) cards.push({ habit: h, kind: 'saved', big: 'Saved', bigIcon: 'shield', line: `Your shield kept ${lower} alive.`, mood: 'relieved', prop });
      else if (weekMet(s, h, week)) {
        const run = weeklyRunEndingAt(s, h, week);
        cards.push({ habit: h, kind: 'streak', big: `${run} week${run === 1 ? '' : 's'}`, bigIcon: 'flame', line: `Your ${lower} streak keeps growing.`, mood: 'cheering', prop });
      } else cards.push({ habit: h, kind: 'love', big: `${n}/${perWeek(h)}`, line: `${h.name} could use a little love.`, pill: nudge(h, n), mood: 'happy', prop });
      continue;
    }

    const days = Array.from({ length: 7 }, (_, i) => addDays(week, i)).filter(d => d >= h.createdAt && d <= last && isPlannedDay(h, d));
    if (!days.length) continue;
    const done = days.filter(d => isDone(s, h, d)).length;
    kept += done;
    if (days.some(d => isShielded(s, h, d))) {
      cards.push({ habit: h, kind: 'saved', big: 'Saved', bigIcon: 'shield', line: `Your shield kept ${lower} alive.`, mood: 'relieved', prop });
    } else if (done === days.length) {
      const line = days.length === 7 ? EVERY_DAY[h.icon] ?? `${h.name}, every single day.` : `You kept every ${lower} day you planned.`;
      cards.push({ habit: h, kind: 'perfect', big: `${done}/${days.length}`, line, mood: 'happy', prop });
    } else if (done / days.length >= 0.7) {
      cards.push({ habit: h, kind: 'steady', big: `${done}/${days.length}`, line: `A steady week for ${lower}.`, mood: 'happy', prop });
    } else {
      cards.push({ habit: h, kind: 'love', big: `${done}/${days.length}`, line: `${h.name} could use a little love.`, pill: nudge(h, done), mood: 'happy', prop });
    }
  }

  cards.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  return { week, cards: cards.slice(0, 4), kept };
}

function weeklyRunEndingAt(s: State, h: Habit, w: DayKey): number {
  let n = 0;
  for (let x = w, i = 0; x >= weekStart(h.createdAt) && i < 520; x = addDays(x, -7), i++) {
    if (weekMet(s, h, x)) n++;
    else if (!isShielded(s, h, x)) break;
  }
  return n;
}

/** A kind, concrete suggestion for next week. */
function nudge(h: Habit, done: number): string {
  if (h.icon === 'shoe') return 'Next week, try a morning walk?';
  if (h.reminder != null && h.reminder >= 20 * 60) return 'Next week, try it a little earlier?';
  return `Next week, aim for ${done + 1}?`;
}
