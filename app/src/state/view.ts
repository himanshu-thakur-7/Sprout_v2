import type { HabitCardProps } from '@/components/HabitCard';
import { addDays, clockLabel, weekdayName, type DayKey } from './dates';
import { count, currentStreak, isPlannedDay, statusOn, target, weekCount } from './logic';
import type { Habit, Schedule, State } from './types';

type CardData = Omit<HabitCardProps, 'onCheck' | 'onCheckLongPress' | 'onOpen'>;

/** Everything a HabitCard needs for today. `nowMin` (minutes since midnight) lets past reminder times read as "Any time today". */
export function cardFor(s: State, h: Habit, today: DayKey, nowMin = 0): CardData {
  const st = statusOn(s, h, today);
  const streak = currentStreak(s, h, today);
  const isNew = streak === 0 && !Object.values(s.logs).some(day => day[h.id]);
  const base = { title: h.name, color: h.color, icon: h.icon, streak, isNew };
  const at = s.logs[today]?.[h.id]?.t;
  const doneLine = `Done · ${at != null ? clockLabel(at) : 'today'}`;
  const sch = h.schedule;
  if (sch.kind === 'thru') {
    const n = count(s, h, today), t = target(h), unitWord = h.unit ?? 'times';
    return { ...base, kind: 'count', state: n >= t ? 'done' : 'progress', progress: n / t, sub: n >= t ? `${doneLine} · ${t} ${unitWord}` : `${n} of ${t} ${unitWord}` };
  }
  if (sch.kind === 'week') {
    const n = weekCount(s, h, today, today), per = sch.perWeek, met = n >= per;
    const common = { ...base, kind: 'weekly' as const, unit: 'wk', progress: n / per };
    if (st === 'rest') return { ...common, state: 'rest', sub: 'Week done · back Monday' };
    if (st === 'done') return met ? { ...common, state: 'done', sub: `${doneLine} · week met` } : { ...common, state: 'done', loggedToday: true, sub: `Logged today · ${n} of ${per}` };
    return { ...common, state: st === 'open' ? 'open' : 'progress', sub: st === 'open' ? `${n} of ${per} · on track` : `${n} of ${per} this week` };
  }
  if (st === 'rest') return { ...base, kind: 'daily', state: 'rest', sub: `Rest day · back ${nextPlanned(h, today)}` };
  return { ...base, kind: 'daily', state: st === 'done' ? 'done' : 'due', sub: st === 'done' ? doneLine : dueLine(h.reminder, nowMin) };
}

/** "Tonight, 9 pm" / "Morning, 7:30 am"; once the time has passed (or with no reminder), "Any time today". */
function dueLine(reminder: number | null, nowMin: number): string {
  if (reminder == null || (nowMin > 0 && nowMin > reminder)) return 'Any time today';
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
