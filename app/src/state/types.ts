import type { IconName } from '@/components/Icon';
import type { AccentId } from '@/theme/colors';
import type { ThemePref } from '@/theme/ThemeProvider';
import type { DayKey } from './dates';

/**
 * How a habit is scheduled — the three "How often?" options.
 * - day:  specific weekdays (Mon-first flags). Streak counts in days.
 * - week: N times a week, any days. Streak counts in weeks.
 * - thru: throughout the day, a reminder every N hours; the day's target is the reminder count.
 */
export type Schedule =
  | { kind: 'day'; days: boolean[] }
  | { kind: 'week'; perWeek: number }
  | { kind: 'thru'; intervalHours: number; startHour: number; endHour: number };

export type Habit = {
  id: string;
  name: string;
  color: AccentId;
  icon: IconName;
  schedule: Schedule;
  /** Minutes since midnight, for day/week habits. */
  reminder: number | null;
  /** Unit word for counters, e.g. "glasses". */
  unit?: string;
  createdAt: DayKey;
  paused?: boolean;
  archived?: boolean;
};

/** One day's record for a habit: count (1 = done for daily/weekly) and the time it was last logged. */
export type Entry = { n: number; t: number };

export type State = {
  version: 1;
  onboarded: boolean;
  habits: Habit[];
  /** logs[day][habitId] */
  logs: Record<DayKey, Record<string, Entry>>;
  /** Periods rescued by a shield: `${habitId}:${periodKey}` (period = day key, or Monday key for weekly habits). */
  shielded: string[];
  /** Slips the person chose to let go ("Start fresh today"). Same key format. */
  dismissedSlips: string[];
  profile: { name: string; since: DayKey | null };
  settings: { reminders: boolean; theme: ThemePref; notificationsAsked: boolean };
};
