import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { Segmented, Tick } from '@/components/Controls';
import { Icon } from '@/components/Icon';
import { Card } from '@/components/Ledge';
import { Pip } from '@/components/Pip';
import { Txt } from '@/components/Txt';
import { accentFor, GREEN } from '@/theme/colors';
import { usePalette } from '@/theme/ThemeProvider';
import { addDays, monthName, parseDay, WEEKDAY_LETTERS, weekday, weekRange, weekStart, type DayKey } from '@/state/dates';
import { count, isDone, isPausedOn, isPlannedDay, isShielded, isWeekly, liveHabits, monthDays, monthRate, perWeek, target, weekCount, weekMet } from '@/state/logic';
import { RecapEntry } from '@/screens/RecapEntry';
import { buildRecap, recapOffered } from '@/state/recap';
import { useStore } from '@/state/store';
import type { Habit, State } from '@/state/types';

type CellKind = 'done' | 'partial' | 'missed' | 'today' | 'rest' | 'future' | 'none';

function cellKind(s: State, h: Habit, d: DayKey, today: DayKey): { k: CellKind; frac?: number } {
  if (d < h.createdAt) return { k: 'none' };
  if (isDone(s, h, d)) return { k: 'done' };
  if (isPausedOn(h, d)) return { k: 'rest' };
  // Rest first: a rest day is a rest day, even today.
  if (h.schedule.kind === 'day' && !isPlannedDay(h, d)) return { k: 'rest' };
  if (d > today) return { k: 'future' };
  if (d === today) {
    const n = count(s, h, d);
    return n > 0 && target(h) > 1 ? { k: 'partial', frac: n / target(h) } : { k: 'today' };
  }
  // Weekly habits pick their own days: an unlogged day is just blank. The week's result lives in the pill.
  if (isWeekly(h)) return { k: 'none' };
  if (isShielded(s, h, d)) return { k: 'rest' };
  return { k: 'missed' };
}

const NAME_W = 88, PILL_W = 38;

/** 15 Progress — rows are habits, columns are days. Missed days stay visible in a quiet sand colour. */
export default function Progress() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { state, today } = useStore();
  const [tab, setTab] = useState<'week' | 'month'>('week');
  const habits = liveHabits(state, today);
  const t = parseDay(today);
  const ws = weekStart(today);

  const recap = useMemo(() => (recapOffered(today) ? buildRecap(state, today) : null), [state, today]);
  const anyWeekly = habits.some(isWeekly);
  const days = monthDays(t.getFullYear(), t.getMonth());
  const month = habits
    .map(h => { const r = monthRate(state, h, today); return { h, rate: r ?? 0, fresh: r == null }; })
    .sort((a, b) => b.rate - a.rate);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }}>
        <Txt size={36} w={900} ls={-1} style={{ paddingTop: 10, paddingHorizontal: 20 }} accessibilityRole="header">Progress</Txt>
        <View style={{ marginTop: 12, marginHorizontal: 20 }}>
          <Segmented options={[['week', 'Week'], ['month', 'Month']]} value={tab} onChange={setTab} />
        </View>

        <Card edge={p.line} bg={p.surface} outerStyle={{ marginTop: 16, marginHorizontal: 20 }} style={{ paddingTop: 14, paddingHorizontal: 14, paddingBottom: 16 }}>
          <Txt size={16} w={900} color={p.headline} style={{ marginBottom: 10 }}>{tab === 'week' ? weekRange(ws) : `${monthName(t.getMonth())} ${t.getFullYear()}`}</Txt>
          {habits.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 10, gap: 6 }}>
              <Pip mood="expectant" size={96} shadow={false} />
              <Txt size={17} w={800}>Your week shows up here.</Txt>
              <Txt size={14} w={400} color={p.secondary} align="center">Plant a habit and each day gets a square.</Txt>
            </View>
          ) : tab === 'week' ? (
            <>
              <View style={{ flexDirection: 'row', gap: 5, marginBottom: 7 }}>
                <View style={{ width: NAME_W }} />
                {WEEKDAY_LETTERS.map((l, i) => {
                  const on = i === weekday(today);
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                      <Txt size={12} w={on ? 900 : 700} color={on ? p.headline : p.label}>{l}</Txt>
                      <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: on ? GREEN.primary : 'transparent' }} />
                    </View>
                  );
                })}
                {anyWeekly ? <View style={{ width: PILL_W }} /> : null}
              </View>
              <View style={{ gap: 7 }}>
                {habits.map(h => {
                  const a = accentFor(h.color, p);
                  return (
                    <Pressable key={h.id} onPress={() => router.push(`/habit/${h.id}`)} accessibilityRole="button" accessibilityLabel={`${h.name} details`}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 30 }}>
                      <View style={{ width: NAME_W, flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 4 }}>
                        <Icon n={h.icon} c={a.base} s={15} />
                        <Txt size={13} w={800} numberOfLines={1} style={{ flex: 1 }}>{h.name}</Txt>
                      </View>
                      {Array.from({ length: 7 }, (_, i) => {
                        const c = cellKind(state, h, addDays(ws, i), today);
                        return <WeekCell key={i} k={c.k} frac={c.frac} base={a.base} edge={a.edge} tint={a.tint} />;
                      })}
                      {anyWeekly ? (
                        <View style={{ width: PILL_W, alignItems: 'flex-end' }}>
                          {isWeekly(h) ? (
                            <View style={{ paddingHorizontal: 6, height: 22, borderRadius: 11, justifyContent: 'center', backgroundColor: weekMet(state, h, today) ? a.tint : p.fill }}>
                              <Txt size={12} w={900} color={weekMet(state, h, today) ? a.ink : p.secondary}>{`${weekCount(state, h, today)}/${perWeek(h)}`}</Txt>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>
                <Legend label="Coloured = done"><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: p.tertiary, alignItems: 'center', justifyContent: 'center' }}><Tick s={8} /></View></Legend>
                <Legend label="Missed"><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: p.missed }} /></Legend>
                <Legend label="Rest"><View style={{ width: 10, height: 10, borderRadius: 3, overflow: 'hidden' }}><Hatch /></View></Legend>
                <Legend label="Ahead"><View style={{ width: 8, height: 8, borderRadius: 3, borderWidth: 1.5, borderStyle: 'dashed', borderColor: p.restLine }} /></Legend>
              </View>
            </>
          ) : (
            <View style={{ gap: 12 }}>
              {habits.map(h => {
                const a = accentFor(h.color, p);
                return (
                  <Pressable key={h.id} onPress={() => router.push(`/habit/${h.id}`)} style={{ gap: 5 }}
                    accessibilityRole="button" accessibilityLabel={`${h.name} details`}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon n={h.icon} c={a.base} s={15} />
                      <Txt size={13} w={800} numberOfLines={1} style={{ flex: 1 }}>{h.name}</Txt>
                    </View>
                    <View style={{ flexDirection: 'row', height: 20, gap: 2 }}>
                      {days.map((d, n) => {
                        const c = cellKind(state, h, d, today);
                        const bg = c.k === 'done' ? a.base : c.k === 'partial' ? a.tint : c.k === 'missed' ? p.missed : c.k === 'today' ? a.tint : c.k === 'rest' ? p.rest : 'transparent';
                        return (
                          <View key={d} style={{ flex: 1, marginLeft: n > 0 && weekday(d) === 0 ? 3 : 0, borderRadius: 2, backgroundColor: bg,
                            borderWidth: c.k === 'future' || c.k === 'today' ? 1 : 0, borderColor: c.k === 'today' ? a.base : p.restLine }} />
                        );
                      })}
                    </View>
                  </Pressable>
                );
              })}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {[1, 8, 15, 22, days.length].map(n => <Txt key={n} size={11} w={700} color={p.label}>{String(n)}</Txt>)}
              </View>
            </View>
          )}
        </Card>

        {recap && recap.cards.length ? (
          <View style={{ marginTop: 16, marginHorizontal: 20 }}><RecapEntry recap={recap} title="Weekly recap" /></View>
        ) : habits.length ? (
          <View style={{ marginTop: 16, marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: p.restLine }}>
            <Icon n="lock" c={p.tertiary} s={20} />
            <View style={{ flex: 1 }}>
              <Txt size={15} w={800}>Recap arrives Sunday</Txt>
              <Txt size={13} w={400} color={p.secondary}>Your week, told as a little story.</Txt>
            </View>
          </View>
        ) : null}
        <Txt size={20} w={900} ls={-0.3} style={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: 8 }}>This month</Txt>
        <Card edge={p.line} bg={p.surface} outerStyle={{ marginHorizontal: 20 }} style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
          {month.map(({ h, rate, fresh }, i) => {
            const a = accentFor(h.color, p);
            const pct = Math.round(rate * 100);
            return (
              <Pressable key={h.id} onPress={() => router.push(`/habit/${h.id}`)} accessibilityRole="button" accessibilityLabel={`${h.name}, ${pct}% this month`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 46, borderBottomWidth: i < month.length - 1 ? 1.5 : 0, borderBottomColor: p.divider }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: a.tint, alignItems: 'center', justifyContent: 'center' }}><Icon n={h.icon} c={a.base} s={17} /></View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt size={14} w={800} numberOfLines={1}>{h.name}</Txt>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: p.fill, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${pct}%`, borderRadius: 4, backgroundColor: a.base }} />
                  </View>
                </View>
                <Txt size={15} w={900} color={fresh ? p.tertiary : a.ink} align="right" style={{ width: 44 }}>{fresh ? 'New' : `${pct}%`}</Txt>
              </Pressable>
            );
          })}
          {month.length === 0 ? <Txt size={14} w={400} color={p.secondary} style={{ paddingVertical: 12 }}>Nothing yet. Your first week starts the day you plant.</Txt> : null}
        </Card>
      </ScrollView>
    </View>
  );
}

function WeekCell({ k, frac = 0.5, base, edge, tint }: { k: CellKind; frac?: number; base: string; edge: string; tint: string }) {
  const p = usePalette();
  const box = { flex: 1, height: 28, borderRadius: 9 } as const;
  if (k === 'done' || k === 'partial') {
    return (
      <View style={{ flex: 1, paddingBottom: 2, marginTop: -2 }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 2, bottom: 0, borderRadius: 9, backgroundColor: edge }} />
        <View style={{ height: 28, borderRadius: 9, backgroundColor: k === 'done' ? base : tint, overflow: 'hidden', justifyContent: 'flex-end' }}>
          {k === 'partial' ? <View style={{ height: `${Math.round(frac * 100)}%`, backgroundColor: base }} /> : null}
        </View>
      </View>
    );
  }
  if (k === 'today') return <View style={[box, { backgroundColor: p.surface, borderWidth: 2, borderColor: base }]} />;
  if (k === 'missed') return <View style={[box, { backgroundColor: p.missed }]} />;
  if (k === 'rest') return <View style={[box, { overflow: 'hidden' }]}><Hatch /></View>;
  if (k === 'future') return <View style={[box, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: p.restLine }]} />;
  return <View style={box} />;
}

/** 135° sand stripes on white: a rest day. */
function Hatch() {
  const p = usePalette();
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <Pattern id="hatch" patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
          <Rect width={6} height={6} fill={p.surface} />
          <Rect width={3} height={6} fill={p.missed} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#hatch)" />
    </Svg>
  );
}

function Legend({ label, children }: { label: string; children: ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {children}
      <Txt size={11} w={700} color={p.label}>{label}</Txt>
    </View>
  );
}
