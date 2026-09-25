import { addDays, weekday, weekStart, type DayKey } from './dates';
import { TEMPLATES } from './templates';
import type { Entry, Habit, State } from './types';

export const EMPTY_STATE: State = {
  version: 1,
  onboarded: false,
  habits: [],
  logs: {},
  shielded: [],
  dismissedSlips: [],
  recapSeen: [],
  celebrated: [],
  firstChecks: [],
  profile: { name: '', since: null },
  settings: { reminders: true, theme: 'system', notificationsAsked: false },
};

export const newId = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

/**
 * The sample account from the designs, relative to today: Water 4 of 8 on an 11-day streak,
 * Gym 2 of 4 this week on 8 weeks, Read 23 days, Meditate 5 days, and Walk resting today.
 */
export function demoState(today: DayKey): State {
  const tpl = (id: string) => TEMPLATES.find(t => t.id === id)!;
  const mk = (id: string, created: number, over: Partial<Habit> = {}): Habit => {
    const t = tpl(id);
    return { id, name: t.name, color: t.color, icon: t.icon, schedule: t.schedule, reminder: t.reminder, unit: t.unit, createdAt: addDays(today, -created), ...over };
  };
  const walkDays = Array.from({ length: 7 }, (_, i) => i !== weekday(today));
  const habits: Habit[] = [
    mk('water', 110), mk('gym', 100), mk('read', 110), mk('meditate', 60),
    mk('walk', 40, { schedule: { kind: 'day', days: walkDays } }),
  ];
  const logs: State['logs'] = {};
  const put = (d: DayKey, id: string, e: Entry) => { (logs[d] ??= {})[id] = e; };
  const rnd = seeded(7);

  for (let i = 1; i <= 110; i++) {
    const d = addDays(today, -i);
    // Water: full the last 11 days, 5 glasses on day 12, mostly full before.
    put(d, 'water', { n: i <= 11 ? 8 : i === 12 ? 5 : rnd() < 0.8 ? 8 : 6, t: 20 * 60 + 40 });
    // Read: every day for 23 days, one miss before that.
    if (i !== 24 && (i <= 23 || rnd() < 0.9)) put(d, 'read', { n: 1, t: 21 * 60 + 10 });
    // Meditate: 5 days, a miss, then patchy.
    if (i <= 60 && (i <= 5 || (i !== 6 && rnd() < 0.7))) put(d, 'meditate', { n: 1, t: 7 * 60 + 30 });
    // Walk: planned days, most of them.
    if (i <= 40 && walkDays[weekday(d)] && (i <= 20 || rnd() < 0.75)) put(d, 'walk', { n: 1, t: 12 * 60 + 40 });
  }

  // Gym: 4 sessions a week for the last 8 full weeks, a short week before that.
  const ws = weekStart(today);
  for (let w = 1; w <= 14; w++) {
    const start = addDays(ws, -7 * w);
    const sessions = w <= 8 ? [0, 2, 4, 5] : w === 9 ? [1, 3] : [0, 2, 3, 5];
    sessions.forEach(o => put(addDays(start, o), 'gym', { n: 1, t: 7 * 60 + 40 }));
  }
  // This week: up to two sessions on the days already behind us.
  [0, 2].map(o => addDays(ws, o)).filter(d => d < today).forEach(d => put(d, 'gym', { n: 1, t: 7 * 60 + 40 }));

  // Today, mid-day: 4 glasses, Read already done.
  put(today, 'water', { n: 4, t: 12 * 60 + 20 });
  put(today, 'read', { n: 1, t: 8 * 60 + 5 });

  return {
    ...EMPTY_STATE,
    onboarded: true,
    habits,
    logs,
    profile: { name: 'Alex', since: addDays(today, -110) },
    settings: { ...EMPTY_STATE.settings, notificationsAsked: true },
  };
}

function seeded(seed: number) {
  let x = seed;
  return () => ((x = (x * 16807) % 2147483647) / 2147483647);
}
