import type { HabitCardProps } from '@/components/HabitCard';
import { addDays, clockLabel, weekdayName, type DayKey } from './dates';
import { count, currentStreak, isPlannedDay, statusOn, target, weekCount } from './logic';
import type { Habit, Schedule, State } from './types';

/** Everything a HabitCard needs for today. */
export function cardFor(s: State, h: Habit, today: DayKey): Omit<HabitCardProps, 'onTap' | 'onLongPress'> {
  const st = statusOn(s, h, today);
  const base = { title: h.name, color: h.color, icon: h.icon, streak: currentStreak(s, h, today) };
  const sch = h.schedule;
  if (sch.kind === 'thru') {
    const n = count(s, h, today), t = target(h);
    return { ...base, kind: 'count', state: n >= t ? 'done' : 'progress', progress: n / t, sub: `${n} of ${t} ${h.unit ?? 'times'}` };
  }
  if (sch.kind === 'week') {
    const n = weekCount(s, h, today, today);
    if (st === 'rest') return { ...base, kind: 'weekly', state: 'rest', unit: 'wk', sub: 'Week done · back Monday' };
    return { ...base, kind: 'weekly', state: st === 'done' ? 'done' : 'progress', progress: n / sch.perWeek, unit: 'wk', sub: `${n} of ${sch.perWeek} this week` };
  }
  if (st === 'rest') return { ...base, kind: 'daily', state: 'rest', sub: `Rest day · back ${nextPlanned(h, today)}` };
  return { ...base, kind: 'daily', state: st === 'done' ? 'done' : 'due', sub: st === 'done' ? 'Done' : dueLine(h.reminder) };
}

/** "Tonight, 9 pm" / "Morning, 7:30 am" / "Any time today". */
function dueLine(reminder: number | null): string {
  if (reminder == null) return 'Any time today';
  const label = clockLabel(reminder).replace(':00', '');
  const h = Math.floor(reminder / 60);
  return `${h >= 18 ? 'Tonight' : h < 12 ? 'Morning' : 'Afternoon'}, ${label}`;
}

function nextPlanned(h: Habit, today: DayKey): string {
  for (let i = 1; i <= 7; i++) {
    const d = addDays(today, i);
    if (isPlannedDay(h, d)) return i === 1 ? 'tomorrow' : weekdayName(d);
  }
  return 'soon';
}

/** "Every day at 9 pm", "4 times a week", "Every 2 hours, 8 am – 10 pm". */
export function scheduleLine(sch: Schedule, reminder: number | null): string {
  const at = reminder != null ? ` at ${clockLabel(reminder).replace(':00', '')}` : '';
  if (sch.kind === 'thru') return `Every ${sch.intervalHours} hour${sch.intervalHours > 1 ? 's' : ''}, ${hour(sch.startHour)} – ${hour(sch.endHour)}`;
  if (sch.kind === 'week') return `${sch.perWeek} time${sch.perWeek > 1 ? 's' : ''} a week`;
  const n = sch.days.filter(Boolean).length;
  if (n === 7) return `Every day${at}`;
  const names = sch.days.map((on, i) => (on ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i] : null)).filter(Boolean);
  return `${names.join(', ')}${at}`;
}

const hour = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'am' : 'pm'}`;
