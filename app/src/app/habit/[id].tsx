import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Stepper } from '@/components/Controls';
import { DoneCheck } from '@/components/HabitCard';
import { Icon, type IconName } from '@/components/Icon';
import { Card } from '@/components/Ledge';
import { Pip } from '@/components/Pip';
import { Ring } from '@/components/Ring';
import { Handle, Sheet } from '@/components/Sheet';
import { Txt } from '@/components/Txt';
import { useAddHabit } from '@/screens/AddHabitSheet';
import { accentFor, ACCENTS, GREEN, mix, onAccent } from '@/theme/colors';
import { usePalette } from '@/theme/ThemeProvider';
import { addDays, clockLabel, dayKey, longDate, monthName, parseDay, WEEKDAY_LETTERS, weekStart, type DayKey } from '@/state/dates';
import {
  bestStreak, count, currentStreak, isDone, isPausedOn, isPlannedDay, isShielded, isWeekly, monthRate, openPause, target, totalDone, usualTime, weekCount,
} from '@/state/logic';
import { useStore } from '@/state/store';
import type { Habit } from '@/state/types';
import { scheduleLine } from '@/state/view';

/** 11 / 12 Habit detail. Weekly habits are judged by the week, so each calendar row ends in a result pill. */
export default function HabitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useStore();
  const h = state.habits.find(x => x.id === id);
  if (!h) return null;
  return <Detail h={h} />;
}

function Detail({ h }: { h: Habit }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { state, today, pauseHabit, resumeHabit } = useStore();
  const { openEdit } = useAddHabit();
  const a = accentFor(h.color, p);
  const paused = isPausedOn(h, today);
  const pausedSince = openPause(h)?.from;
  // Ink on every accent but berry; paused headers are washed out; dark mode tones the accent down.
  const head = paused ? mix(ACCENTS[h.color].base, p.dark ? p.surface : '#F6F0E5', 0.35) : p.dark ? mix(ACCENTS[h.color].base, p.bg, 0.9) : ACCENTS[h.color].base;
  const hc = paused ? p.ink : onAccent(h.color);
  const weekly = isWeekly(h);
  const longName = h.name.length > 14;

  const cur = currentStreak(state, h, today);
  const best = useMemo(() => bestStreak(state, h, today), [state, h, today]);
  const u = (n: number) => `${n} ${weekly ? (n === 1 ? 'week' : 'weeks') : n === 1 ? 'day' : 'days'}`;
  const pipMood = paused ? 'sleepy' : cur > 0 && cur >= best && best >= 3 ? 'proud' : cur === 0 ? 'expectant' : 'happy';

  const sch = h.schedule;
  const t = target(h);
  let pill = '', ring: ReactNode;
  if (sch.kind === 'week') {
    const n = weekCount(state, h, today, today);
    pill = `${n} of ${sch.perWeek} this week`;
    ring = <Ring size={26} stroke={4.5} progress={n / sch.perWeek} color={a.base} track={a.tint} />;
  } else if (isDone(state, h, today)) {
    pill = 'Done today';
    ring = <DoneCheck size={26} />;
  } else if (sch.kind === 'thru') {
    pill = `${count(state, h, today)} of ${t} today`;
    ring = <Ring size={26} stroke={4.5} progress={count(state, h, today) / t} color={a.base} track={a.tint} />;
  } else {
    pill = isPlannedDay(h, today) ? 'Not yet today' : 'Rest day';
    ring = <Ring size={26} stroke={4.5} progress={0} color={a.base} track={a.tint} />;
  }

  const rate = monthRate(state, h, today);
  const usual = usualTime(state, h);
  const total = totalDone(state, h);
  const stats: { icon: IconName; tint: string; c: string; v: string; l: string }[] = [
    { icon: 'check', tint: accentFor('leaf', p).tint, c: GREEN.edge, v: rate == null ? '—' : `${Math.round(rate * 100)}%`, l: weekly ? 'weekly goal hit' : 'this month' },
    { icon: h.icon, tint: a.tint, c: a.base, v: String(total), l: sch.kind === 'thru' ? `${h.unit ?? 'times'} total` : 'times done' },
    { icon: 'clock', tint: accentFor('lavender', p).tint, c: ACCENTS.lavender.edge, v: usual != null ? clockLabel(usual) : '—', l: 'usually' },
  ];
  const headPill = paused ? `Paused since ${shortDate(pausedSince ?? today)}` : best === 0 ? 'Just planted 🌱' : cur > 0 && cur >= best ? 'Your best yet ✦' : `Best: ${u(best)}`;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={{ paddingBottom: 4 }}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 4, bottom: 0, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, backgroundColor: paused ? p.softLedge : ACCENTS[h.color].edge }} />
          <View style={{ height: insets.top + 192, backgroundColor: head, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingTop: insets.top }}>
            <View style={{ alignItems: 'center', paddingTop: 16, gap: 2 }}>
              <Icon n={paused ? 'pause' : 'flame'} c={hc} c2={head} s={36} />
              <Txt size={60} w={900} ls={-2} color={hc} style={{ lineHeight: 64 }}>{u(cur)}</Txt>
              <View style={{ marginTop: 10, paddingVertical: 5, paddingHorizontal: 14, borderRadius: 14, backgroundColor: hc === '#FFFFFF' ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.55)' }}>
                <Txt size={14} w={800} color={hc === '#FFFFFF' ? '#FFFFFF' : '#1F2A24'}>{headPill}</Txt>
              </View>
            </View>
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={4}
              style={{ position: 'absolute', left: 14, top: insets.top + 4, width: 44, height: 44, borderRadius: 22, backgroundColor: hc === '#FFFFFF' ? 'rgba(255,255,255,0.22)' : 'rgba(31,42,36,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon n="arrowL" c={hc} s={22} />
            </Pressable>
            <View style={{ position: 'absolute', right: 18, bottom: -20 }}><Pip mood={pipMood} prop={pipMood === 'proud' ? 'trophy' : 'none'} size={80} shadow={false} /></View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 24, paddingHorizontal: 20, gap: 12 }}>
          <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: longName ? '100%' : 0, minWidth: 0 }}>
            <Txt size={longName ? 28 : 32} w={900} ls={-0.8} lh={1.05} numberOfLines={3} accessibilityRole="header">{h.name}</Txt>
            <Txt size={14} w={400} color={p.secondary} style={{ marginTop: 2 }}>{paused ? 'Paused · streak is safe while you’re away' : scheduleLine(sch, h.reminder)}</Txt>
          </View>
          {!paused ? (
            <Card edge={p.line} bg={p.surface} radius={22} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 14, paddingRight: 6 }}>
              <Txt size={14} w={800}>{pill}</Txt>
              {ring}
            </Card>
          ) : null}
        </View>

        {paused ? <Button label="Resume" icon="sprout" onPress={() => resumeHabit(h.id)} style={{ marginTop: 16, marginHorizontal: 20 }} /> : null}

        <MonthCalendar h={h} />

        <View style={{ marginTop: 16, marginHorizontal: 20, flexDirection: 'row', gap: 8 }}>
          {stats.map(s => (
            <Card key={s.l} edge={p.line} bg={p.surface} radius={24} outerStyle={{ flex: 1 }} style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 4 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: s.tint, alignItems: 'center', justifyContent: 'center' }}><Icon n={s.icon} c={s.c} s={19} c2={s.tint} /></View>
              <Txt size={20} w={900} ls={-0.4} numberOfLines={1} adjustsFontSizeToFit>{s.v}</Txt>
              <Txt size={12} w={600} color={p.secondary} numberOfLines={1}>{s.l}</Txt>
            </Card>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, marginHorizontal: 20 }}>
          <Button label="Edit" variant="secondary" icon="pencil" onPress={() => openEdit(h)} style={{ flex: 1 }} />
          {!paused ? <Button label="Pause" variant="secondary" icon="pause" onPress={() => pauseHabit(h.id)} style={{ flex: 1 }} /> : null}
        </View>
        {!paused ? <Txt size={13} w={600} color={p.hint} align="center" style={{ marginTop: 10, marginHorizontal: 32 }}>Pausing keeps your streak. Paused days never count as missed.</Txt> : null}
      </ScrollView>
    </View>
  );
}

const shortDate = (d: DayKey) => { const x = parseDay(d); return `${monthName(x.getMonth()).slice(0, 3)} ${x.getDate()}`; };

type Cell = { t: string; bg: string; border?: string; ledge?: string; c: string; fs?: number; fill?: number; faded?: boolean; day?: DayKey };

/** How far back a day can be fixed from the calendar. */
const BACKFILL_DAYS = 7;

function MonthCalendar({ h }: { h: Habit }) {
  const p = usePalette();
  const { state, today } = useStore();
  const a = accentFor(h.color, p);
  const base = ACCENTS[h.color];
  const onText = onAccent(h.color);
  const weekly = h.schedule.kind === 'week';
  const per = h.schedule.kind === 'week' ? h.schedule.perWeek : 0;
  const t = target(h);
  const [editing, setEditing] = useState<DayKey | null>(null);

  const t0 = parseDay(today);
  const [offset, setOffset] = useState(0);
  const first = new Date(t0.getFullYear(), t0.getMonth() + offset, 1);
  const created = parseDay(h.createdAt);
  const canPrev = first > new Date(created.getFullYear(), created.getMonth(), 1);
  const canNext = offset < 0;

  const month = first.getMonth();
  const firstKey = dayKey(first);
  const rows: DayKey[][] = [];
  for (let w = weekStart(firstKey); parseDay(w).getMonth() === month || w < firstKey; w = addDays(w, 7)) {
    rows.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)));
  }
  const editable = (d: DayKey) => d <= today && d >= h.createdAt && d >= addDays(today, -BACKFILL_DAYS);

  const cell = (d: DayKey): Cell => {
    const faded = parseDay(d).getMonth() !== month;
    const n = String(parseDay(d).getDate());
    const c = count(state, h, d);
    const common = { t: n, faded, day: editable(d) ? d : undefined };
    if (isDone(state, h, d)) return { ...common, bg: base.base, ledge: base.edge, c: onText };
    if (d === today) return { ...common, bg: p.surface, border: base.base, c: p.ink, fill: t > 1 ? c / t : 0 };
    if (d > today || d < h.createdAt) return { ...common, bg: 'transparent', c: p.future };
    if (isShielded(state, h, d)) return { ...common, bg: a.tint, border: base.edge, c: a.ink };
    if (isPausedOn(h, d)) return { ...common, bg: 'transparent', c: p.future };
    // Weekly habits aren't due on any particular day, so a day without a session is just a day.
    if (weekly || !isPlannedDay(h, d)) return { ...common, bg: 'transparent', c: p.secondary };
    return { ...common, bg: p.rest, c: p.secondary, fill: t > 1 ? c / t : 0 };
  };

  const weekPill = (row: DayKey[]): Cell => {
    const ws = row[0];
    if (ws > today || addDays(ws, 6) < h.createdAt) return { t: '', bg: 'transparent', c: p.secondary };
    const n = weekCount(state, h, ws);
    if (n >= per) return { t: `${per}/${per} ✓`, bg: accentFor('leaf', p).tint, c: p.dark ? GREEN.darkHeadline : '#2F7A48', fs: 13 };
    if (addDays(ws, 6) >= today) return { t: `${n}/${per}`, bg: a.tint, c: a.ink, fs: 13 };
    if (isShielded(state, h, ws)) return { t: `${n}/${per} ◆`, bg: accentFor('lavender', p).tint, c: ACCENTS.lavender.ink, fs: 13 };
    return { t: `${n}/${per}`, bg: p.rest, c: p.secondary, fs: 13 };
  };

  const Box = ({ c, width }: { c: Cell; width?: number }) => {
    const inner = (
      <View style={{ paddingBottom: c.ledge ? 3 : 0, marginBottom: c.ledge ? 0 : 3, opacity: c.faded ? 0.4 : 1 }}>
        {c.ledge ? <View style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, borderRadius: 12, backgroundColor: c.ledge }} /> : null}
        <View style={{ height: 36, borderRadius: 12, backgroundColor: c.bg, borderWidth: c.border ? 2 : 0, borderColor: c.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {c.fill ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${Math.round(c.fill * 100)}%`, backgroundColor: a.tint }} /> : null}
          <Txt size={c.fs ?? 14} w={800} color={c.c} numberOfLines={1}>{c.t}</Txt>
        </View>
      </View>
    );
    if (!c.day) return <View style={{ flex: width ? undefined : 1, width }}>{inner}</View>;
    const d = c.day;
    return (
      <Pressable onPress={() => setEditing(d)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`${longDate(d)}, ${isDone(state, h, d) ? 'done' : 'not done'}. Tap to change.`}>
        {inner}
      </Pressable>
    );
  };

  return (
    <>
      <Card edge={p.line} bg={p.surface} outerStyle={{ marginTop: 16, marginHorizontal: 20 }} style={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Txt size={17} w={900} color={p.headline}>{`${monthName(month)} ${first.getFullYear()}`}</Txt>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([['arrowL', -1, canPrev], ['arrowR', 1, canNext]] as const).map(([icon, dir, can]) => (
              <Pressable key={icon} disabled={!can} onPress={() => setOffset(o => o + dir)} hitSlop={4} accessibilityRole="button" accessibilityLabel={dir < 0 ? 'Previous month' : 'Next month'}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: p.rest, alignItems: 'center', justifyContent: 'center', opacity: can ? 1 : 0.5 }}>
                <Icon n={icon} c={p.secondary} s={16} />
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {WEEKDAY_LETTERS.map((l, i) => (
              <Txt key={i} size={12} w={800} color={p.label} align="center" style={{ flex: 1 }}>{l}</Txt>
            ))}
            {weekly ? <View style={{ width: 50 }} /> : null}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: 4 }}>
              {row.map(d => <Box key={d} c={cell(d)} />)}
              {weekly ? <Box c={weekPill(row)} width={50} /> : null}
            </View>
          ))}
        </View>
        <Txt size={12} w={600} color={p.hint} align="center" style={{ marginTop: 8 }}>Forgot to tap? Fix any of the last 7 days.</Txt>
      </Card>
      <BackfillSheet h={h} day={editing} onClose={() => setEditing(null)} />
    </>
  );
}

/** Mark a recent day done (or not), or set a counter's total for it. */
function BackfillSheet({ h, day, onClose }: { h: Habit; day: DayKey | null; onClose: () => void }) {
  const p = usePalette();
  const { state, setCount } = useStore();
  const [shown, setShown] = useState<DayKey | null>(day);
  if (day && day !== shown) setShown(day);
  const d = day ?? shown;
  const t = target(h);
  const n = d ? count(state, h, d) : 0;
  return (
    <Sheet visible={!!day} onClose={onClose} style={{ paddingTop: 10, paddingHorizontal: 20, gap: 16 }}>
      <Handle />
      <Txt size={22} w={800} ls={-0.3}>{d ? longDate(d) : ''}</Txt>
      {t > 1 ? (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Stepper value={n} min={0} max={t} label={`${n} of ${t} ${h.unit ?? 'times'}`}
            onDown={() => d && setCount(h.id, d, Math.max(0, n - 1))} onUp={() => d && setCount(h.id, d, Math.min(t, n + 1))} />
          <Button label="Done" onPress={onClose} style={{ alignSelf: 'stretch', marginTop: 8 }} />
        </View>
      ) : n >= 1 ? (
        <Button label="Mark as not done" variant="secondary" onPress={() => { if (d) setCount(h.id, d, 0); onClose(); }} />
      ) : (
        <Button label="Mark as done" icon="check" onPress={() => { if (d) setCount(h.id, d, 1); onClose(); }} />
      )}
      <Txt size={13} w={600} color={p.hint} align="center" style={{ marginBottom: 8 }}>Streaks update straight away.</Txt>
    </Sheet>
  );
}
