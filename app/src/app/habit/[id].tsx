import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tick } from '@/components/Controls';
import { Icon, type IconName } from '@/components/Icon';
import { Card } from '@/components/Ledge';
import { Pip } from '@/components/Pip';
import { Ring } from '@/components/Ring';
import { Txt } from '@/components/Txt';
import { useAddHabit } from '@/screens/AddHabitSheet';
import { accentFor, ACCENTS, GREEN, LIGHT_ACCENTS } from '@/theme/colors';
import { usePalette } from '@/theme/ThemeProvider';
import { addDays, clockLabel, dayKey, monthName, parseDay, WEEKDAY_LETTERS, weekStart, type DayKey } from '@/state/dates';
import {
  bestStreak, count, currentStreak, isDone, isPlannedDay, isShielded, isWeekly, monthRate, target, totalDone, usualTime, weekCount,
} from '@/state/logic';
import { useStore } from '@/state/store';
import type { Habit } from '@/state/types';
import { scheduleLine } from '@/state/view';
import { confirm } from '@/utils/confirm';

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
  const { state, today, updateHabit, archiveHabit } = useStore();
  const { openEdit } = useAddHabit();
  const a = accentFor(h.color, p);
  const light = LIGHT_ACCENTS.includes(h.color);
  const hc = light ? '#1F2A24' : '#FFFFFF';
  const weekly = isWeekly(h);

  const cur = currentStreak(state, h, today);
  const best = useMemo(() => bestStreak(state, h, today), [state, h, today]);
  const u = (n: number) => `${n} ${weekly ? (n === 1 ? 'week' : 'weeks') : n === 1 ? 'day' : 'days'}`;

  const sch = h.schedule;
  const t = target(h);
  let pill = '', ring: ReactNode;
  if (sch.kind === 'week') {
    const n = weekCount(state, h, today, today);
    pill = `${n} of ${sch.perWeek} this week`;
    ring = <Ring size={26} stroke={4.5} progress={n / sch.perWeek} color={a.base} track={a.tint} />;
  } else if (isDone(state, h, today)) {
    pill = 'Done today';
    ring = <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: GREEN.primary, alignItems: 'center', justifyContent: 'center' }}><Tick /></View>;
  } else if (sch.kind === 'thru') {
    pill = `${count(state, h, today)} of ${t} today`;
    ring = <Ring size={26} stroke={4.5} progress={count(state, h, today) / t} color={a.base} track={a.tint} />;
  } else {
    pill = isPlannedDay(h, today) ? 'Not yet today' : 'Rest day';
    ring = <Ring size={26} stroke={4.5} progress={0} color={a.base} track={a.tint} />;
  }

  const rate = Math.round(monthRate(state, h, today) * 100);
  const usual = usualTime(state, h);
  const total = totalDone(state, h);
  const stats: { icon: IconName; tint: string; c: string; v: string; l: string }[] = [
    { icon: 'check', tint: accentFor('leaf', p).tint, c: GREEN.edge, v: `${rate}%`, l: weekly ? 'weekly goal hit' : 'this month' },
    { icon: h.icon, tint: a.tint, c: a.base, v: String(total), l: sch.kind === 'thru' ? `${h.unit ?? 'times'} total` : 'times done' },
    { icon: 'clock', tint: accentFor('lavender', p).tint, c: ACCENTS.lavender.edge, v: usual != null ? clockLabel(usual) : '—', l: 'usually' },
  ];

  const archive = async () => {
    if (await confirm(`Archive ${h.name}?`, 'It leaves Today, and its history stays safe.', 'Archive', 'Keep it', true)) {
      archiveHabit(h.id);
      router.back();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={{ paddingBottom: 4 }}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 4, bottom: 0, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, backgroundColor: a.edge }} />
          <View style={{ height: insets.top + 192, backgroundColor: a.base, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingTop: insets.top }}>
            <View style={{ alignItems: 'center', paddingTop: 16, gap: 2 }}>
              <Icon n="flame" c={hc} c2={a.base} s={36} />
              <Txt size={60} w={900} ls={-2} color={hc} style={{ lineHeight: 64 }}>{u(cur)}</Txt>
              <View style={{ marginTop: 10, paddingVertical: 5, paddingHorizontal: 14, borderRadius: 14, backgroundColor: light ? 'rgba(255,255,255,0.55)' : a.edge }}>
                <Txt size={14} w={800} color={hc}>{cur > 0 && cur >= best ? 'Your best yet ✦' : `Best: ${u(best)}`}</Txt>
              </View>
            </View>
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}
              style={{ position: 'absolute', left: 16, top: insets.top + 6, width: 40, height: 40, borderRadius: 20, backgroundColor: light ? 'rgba(31,42,36,0.08)' : 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon n="arrowL" c={hc} s={22} />
            </Pressable>
            <View style={{ position: 'absolute', right: 18, bottom: -20 }}><Pip mood={cur > 0 ? 'happy' : 'expectant'} size={80} shadow={false} /></View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 22, paddingHorizontal: 20, gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={32} w={900} ls={-0.8} lh={1.05} numberOfLines={2} accessibilityRole="header">{h.name}</Txt>
            <Txt size={14} w={400} color={p.secondary} style={{ marginTop: 2 }}>{h.paused ? 'Paused' : scheduleLine(sch, h.reminder)}</Txt>
          </View>
          <Card edge={p.line} bg={p.surface} radius={22} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 14, paddingRight: 6 }}>
            <Txt size={14} w={800}>{pill}</Txt>
            {ring}
          </Card>
        </View>

        <MonthCalendar h={h} />

        <View style={{ marginTop: 16, marginHorizontal: 20, flexDirection: 'row', gap: 10 }}>
          {stats.map(s => (
            <Card key={s.l} edge={p.line} bg={p.surface} radius={20} outerStyle={{ flex: 1 }} style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 4 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: s.tint, alignItems: 'center', justifyContent: 'center' }}><Icon n={s.icon} c={s.c} s={19} c2={s.tint} /></View>
              <Txt size={20} w={900} ls={-0.4} numberOfLines={1} adjustsFontSizeToFit>{s.v}</Txt>
              <Txt size={12} w={400} color={p.secondary} numberOfLines={1}>{s.l}</Txt>
            </Card>
          ))}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 18 }}>
          <Pressable onPress={() => openEdit(h)} hitSlop={8}><Txt size={14} w={800} color={p.secondary}>Edit</Txt></Pressable>
          <Txt size={14} w={800} color={p.handle}>·</Txt>
          <Pressable onPress={() => updateHabit(h.id, { paused: !h.paused })} hitSlop={8}><Txt size={14} w={800} color={p.secondary}>{h.paused ? 'Resume' : 'Pause'}</Txt></Pressable>
          <Txt size={14} w={800} color={p.handle}>·</Txt>
          <Pressable onPress={archive} hitSlop={8}><Txt size={14} w={800} color={p.secondary}>Archive</Txt></Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

type Cell = { t: string; bg: string; border?: string; ledge?: string; c: string; fs?: number; label?: string };

function MonthCalendar({ h }: { h: Habit }) {
  const p = usePalette();
  const { state, today } = useStore();
  const a = accentFor(h.color, p);
  const base = ACCENTS[h.color];
  const onText = LIGHT_ACCENTS.includes(h.color) ? '#1F2A24' : '#FFFFFF';
  const weekly = h.schedule.kind === 'week';
  const per = h.schedule.kind === 'week' ? h.schedule.perWeek : 0;

  const t0 = parseDay(today);
  const [offset, setOffset] = useState(0);
  const first = new Date(t0.getFullYear(), t0.getMonth() + offset, 1);
  const created = parseDay(h.createdAt);
  const canPrev = first > new Date(created.getFullYear(), created.getMonth(), 1);
  const canNext = offset < 0;

  const month = first.getMonth();
  const firstKey = dayKey(first);
  const rows: (DayKey | null)[][] = [];
  for (let w = weekStart(firstKey); parseDay(w).getMonth() === month || w < firstKey; w = addDays(w, 7)) {
    rows.push(Array.from({ length: 7 }, (_, i) => { const d = addDays(w, i); return parseDay(d).getMonth() === month ? d : null; }));
  }

  const cell = (d: DayKey | null): Cell => {
    if (!d) return { t: '', bg: 'transparent', c: p.secondary };
    const n = String(parseDay(d).getDate());
    if (isDone(state, h, d)) return { t: n, bg: base.base, ledge: base.edge, c: onText };
    if (d === today) return { t: n, bg: p.surface, border: base.base, c: p.ink };
    if (d > today || d < h.createdAt) return { t: n, bg: 'transparent', c: p.dark ? p.tertiary : '#CFC9BE' };
    if (isShielded(state, h, d)) return { t: n, bg: a.tint, border: base.edge, c: a.ink, label: 'shield' };
    if (!weekly && !isPlannedDay(h, d)) return { t: n, bg: 'transparent', c: p.secondary };
    return { t: n, bg: p.rest, c: p.secondary };
  };

  const weekPill = (row: (DayKey | null)[]): Cell => {
    const any = row.find(Boolean) as DayKey;
    const ws = weekStart(any);
    if (ws > today) return { t: '', bg: 'transparent', c: p.secondary };
    const n = weekCount(state, h, ws);
    if (n >= per) return { t: `${per}/${per} ✓`, bg: accentFor('leaf', p).tint, c: p.dark ? GREEN.darkHeadline : '#2F7A48', fs: 13 };
    if (addDays(ws, 6) >= today) return { t: `${n}/${per}`, bg: a.tint, c: a.ink, fs: 13 };
    if (isShielded(state, h, ws)) return { t: `${n}/${per} ◆`, bg: accentFor('lavender', p).tint, c: ACCENTS.lavender.ink, fs: 13 };
    return { t: `${n}/${per}`, bg: p.rest, c: p.secondary, fs: 13 };
  };

  const Box = ({ c, flex = 1, width }: { c: Cell; flex?: number; width?: number }) => (
    <View style={{ flex: width ? undefined : flex, width, paddingBottom: c.ledge ? 3 : 0, marginBottom: c.ledge ? 0 : 3 }}>
      {c.ledge ? <View style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, borderRadius: 11, backgroundColor: c.ledge }} /> : null}
      <View style={{ height: 36, borderRadius: 11, backgroundColor: c.bg, borderWidth: c.border ? 2 : 0, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={c.fs ?? 14} w={800} color={c.c} numberOfLines={1}>{c.t}</Txt>
      </View>
    </View>
  );

  return (
    <Card edge={p.line} bg={p.surface} outerStyle={{ marginTop: 16, marginHorizontal: 20 }} style={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Txt size={17} w={900} color={p.headline}>{`${monthName(month)} ${first.getFullYear()}`}</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([['arrowL', -1, canPrev], ['arrowR', 1, canNext]] as const).map(([icon, dir, can]) => (
            <Pressable key={icon} disabled={!can} onPress={() => setOffset(o => o + dir)} accessibilityRole="button" accessibilityLabel={dir < 0 ? 'Previous month' : 'Next month'}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: p.rest, alignItems: 'center', justifyContent: 'center', opacity: can ? 1 : 0.5 }}>
              <Icon n={icon} c={p.secondary} s={16} />
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {WEEKDAY_LETTERS.map((l, i) => (
            <Txt key={i} size={12} w={800} color={p.label} align="center" style={{ flex: 1 }}>{l}</Txt>
          ))}
          {weekly ? <View style={{ width: 50 }} /> : null}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 5 }}>
            {row.map((d, i) => <Box key={i} c={cell(d)} />)}
            {weekly ? <Box c={weekPill(row)} width={50} /> : null}
          </View>
        ))}
      </View>
    </Card>
  );
}
