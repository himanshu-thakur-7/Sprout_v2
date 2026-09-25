import { router } from 'expo-router';
import { createRef, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOutUp, Keyframe, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gradient, Hill } from '@/components/Backdrop';
import { Button } from '@/components/Button';
import { ConfettiLayer, Scatter, useConfetti } from '@/components/Confetti';
import { Bubble, DailyBadge } from '@/components/Controls';
import { DoneCheck, HabitCard } from '@/components/HabitCard';
import { Icon } from '@/components/Icon';
import { Card } from '@/components/Ledge';
import { Pip, type PipMood } from '@/components/Pip';
import { useToast } from '@/components/Toast';
import { Txt } from '@/components/Txt';
import { useAddHabit } from '@/screens/AddHabitSheet';
import { RecapEntry } from '@/screens/RecapEntry';
import { SlipSheet } from '@/screens/SlipSheet';
import { ACCENTS, accentFor, DUSK, GOLD } from '@/theme/colors';
import { springEase, springEaseFn } from '@/theme/motion';
import { usePalette } from '@/theme/ThemeProvider';
import { addDays, longDate, monthName, parseDay } from '@/state/dates';
import { currentStreak, dueOn, findSlip, type Slip, isDone, isPausedOn, isPerfectDay, liveHabits, monthDays, statusOn, target } from '@/state/logic';
import { buildRecap, recapOffered, recapWeek } from '@/state/recap';
import { useStore } from '@/state/store';
import type { Habit } from '@/state/types';
import { cardFor } from '@/state/view';
import { successHaptic, tapHaptic } from '@/utils/haptics';

export default function TodayScreen() {
  return (
    <ConfettiLayer>
      <Today />
    </ConfettiLayer>
  );
}

/** Streak lengths that get a moment of their own. */
const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
/** How long the last check-off gets before Perfect day takes over. */
const FINAL_BEAT = 1100;
const TAP_LINES = ['Hehe, that tickles!', 'Hi hi hi!', 'I’m rooting for you.', 'You’ve got this.', 'Boop!'];

function Today() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { state, today, now, tap, untap, setCount } = useStore();
  const { burstFrom } = useConfetti();
  const { show } = useToast();
  const { openAdd } = useAddHabit();

  const live = liveHabits(state, today);
  const active = live.filter(h => !isPausedOn(h, today));
  const due = dueOn(state, today);
  const thisWeek = active.filter(h => statusOn(state, h, today) === 'open');
  const resting = [...active.filter(h => statusOn(state, h, today) === 'rest'), ...live.filter(h => isPausedOn(h, today))];
  const doneN = due.filter(h => isDone(state, h, today)).length;
  const total = due.length;
  const empty = live.length === 0;
  const allRest = !empty && total === 0 && thisWeek.length === 0;
  const perfect = isPerfectDay(state, today);
  const hour = now.getHours(), nowMin = hour * 60 + now.getMinutes();
  const evening = hour >= 20 && !p.dark;
  const late = hour >= 23 || hour < 5 || nowMin >= 22 * 60 + 30;

  // Streak slips: shown once per missed period until the person decides.
  const [snoozed, setSnoozed] = useState<string[]>([]);
  const recap = recapOffered(today) && !state.recapSeen.includes(recapWeek(today)) ? buildRecap(state, today) : null;
  const slips = active.map(h => findSlip(state, h, today)).filter((s): s is Slip => !!s && !snoozed.includes(s.key));
  const slip = slips[0] ?? null;
  // While a slip waits for a decision, the card keeps showing the streak at stake, not 0.
  const atStake = Object.fromEntries(slips.map(s => [s.habit.id, s.lost]));

  // Pip: a cheer after each check-off, a giggle when tapped.
  const [cheer, setCheer] = useState(false);
  const [giggle, setGiggle] = useState<string | null>(null);
  const [landed, setLanded] = useState<string | null>(null);
  const [wiggles, setWiggles] = useState<Record<string, number>>({});
  // The final check of the day plays in full before Perfect day takes over.
  const [holding, setHolding] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tapN = useRef(0);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  const refs = useRef<Record<string, RefObject<View | null>>>({});
  const refFor = (id: string) => (refs.current[id] ??= createRef<View>());

  // Milestones: when a streak crosses 3, 7, 30… say so.
  const streaks = Object.fromEntries(due.map(h => [h.id, currentStreak(state, h, today)]));
  const seenStreaks = useRef<Record<string, number>>(streaks);
  useEffect(() => {
    for (const h of due) {
      const before = seenStreaks.current[h.id], now2 = streaks[h.id];
      if (before != null && now2 > before && MILESTONES.includes(now2)) {
        show({ text: `${now2} ${h.schedule.kind === 'week' ? 'weeks' : 'days'} of ${h.name.toLowerCase()}! That’s a real streak.`, mood: 'proud', ms: 4500 });
      }
    }
    seenStreaks.current = streaks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(streaks)]);

  const onCheck = (h: Habit) => {
    const willBePerfect = due.length > 0 && due.every(x => x.id === h.id || isDone(state, x, today));
    const r = tap(h.id);
    if (!r) return;
    if (r.kind === 'completed') {
      successHaptic();
      later(() => burstFrom(refFor(h.id), ACCENTS[h.color].base), 120);
      setLanded(h.id);
      setCheer(true);
      later(() => setCheer(false), 900);
      if (r.firstEver) show({ text: 'Your first streak starts today 🔥', mood: 'cheering' });
      if (willBePerfect && due.some(x => x.id === h.id)) {
        setHolding(true);
        later(() => setHolding(false), FINAL_BEAT);
      }
    } else if (r.kind === 'full') {
      setWiggles(w => ({ ...w, [h.id]: (w[h.id] ?? 0) + 1 }));
      show({ text: `${target(h)}/${target(h)} — nice! Hold the ring to take one back.`, mood: 'happy', ms: 2500 });
    } else if (r.kind === 'unchecked') {
      tapHaptic();
      show({ text: `${h.name} unchecked`, action: 'Undo', onAction: () => setCount(h.id, today, r.prev), mood: 'expectant' });
    } else tapHaptic();
  };

  const onTakeBack = (h: Habit) => {
    if (target(h) <= 1 || (state.logs[today]?.[h.id]?.n ?? 0) === 0) return;
    const prev = state.logs[today]?.[h.id]?.n ?? 0;
    tapHaptic();
    untap(h.id);
    show({ text: 'Took one back.', action: 'Undo', onAction: () => setCount(h.id, today, prev), mood: 'expectant', ms: 3000 });
  };

  const onPipTap = () => {
    tapHaptic();
    setGiggle(TAP_LINES[tapN.current++ % TAP_LINES.length]);
    later(() => setGiggle(null), 1800);
  };

  // Mood and bubble come from one switch, so they can never contradict each other.
  let mood: PipMood = 'expectant', bubble = '';
  if (empty) { mood = 'expectant'; bubble = 'Hi! I’m Pip.'; }
  else if (slip) { mood = 'droopy'; bubble = 'Oh no — want to save it?'; }
  else if (allRest) { mood = 'sleepy'; bubble = 'Rest day. Enjoy it.'; }
  else if (cheer) { mood = 'cheering'; bubble = progressLine(doneN, total, hour); }
  else if (late && doneN < total) { mood = 'sleepy'; bubble = 'Tomorrow’s a fresh one. Sleep well.'; }
  else if (evening && doneN < total) { mood = 'expectant'; bubble = 'Still time for a couple. No rush.'; }
  else { mood = doneN > 0 ? 'happy' : 'expectant'; bubble = progressLine(doneN, total, hour); }
  if (giggle) { mood = 'relieved'; bubble = giggle; }

  const dateColor = evening ? DUSK.label : p.headline;
  const hill = p.dark ? p.fill : evening ? DUSK.hill : p.fill;
  const sheet = <SlipSheet key="slip-sheet" slips={slips} onLater={keys => setSnoozed(s => [...s, ...keys])} />;

  if (perfect && !slip && !holding) {
    return (
      <View style={{ flex: 1, backgroundColor: p.bg }}>
        <PerfectDay due={due} resting={[...thisWeek, ...resting]} onUntap={h => {
          const prev = state.logs[today]?.[h.id]?.n ?? 0;
          untap(h.id);
          show({ text: `${h.name} unchecked`, action: 'Undo', onAction: () => setCount(h.id, today, prev), mood: 'expectant' });
        }} />
        {sheet}
      </View>
    );
  }

  const pipCentre = width / 2 - (bubble ? 44 : 0);
  const card = (h: Habit, i: number) => (
    <Animated.View key={h.id} exiting={FadeOutUp.delay(i * 40).duration(380)}>
      <HabitCard ref={refFor(h.id)} {...withStake(cardFor(state, h, today, nowMin), atStake[h.id])} celebrate={landed === h.id} wiggle={wiggles[h.id] ?? 0}
        onCheck={() => onCheck(h)} onCheckLongPress={() => onTakeBack(h)} onOpen={() => router.push(`/habit/${h.id}`)} />
    </Animated.View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      {evening ? <Gradient id="dusk" stops={[[0, DUSK.top], [0.24, '#E2E2E1'], [0.44, '#F4EFE7'], [0.6, p.bg]]} /> : null}
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 136 }} showsVerticalScrollIndicator={false}>
        <Hill top={insets.top + (empty ? 196 : 146)} color={hill} ground />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 44 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {evening ? <Icon n="moon" c={DUSK.moon} s={14} /> : null}
            <Txt size={12} w={800} ls={0.6} caps color={dateColor} accessibilityRole="header">{longDate(today)}</Txt>
          </View>
          {!empty && total > 0 ? <DailyBadge done={doneN} total={total} /> : null}
        </View>
        <View style={{ height: empty ? 212 : 168 }}>
          <Pressable onPress={onPipTap} accessibilityRole="button" accessibilityLabel="Pip" accessibilityHint="Say hi to Pip"
            style={{ position: 'absolute', top: 0, left: pipCentre - (empty ? 75 : 60) }}>
            <PipBoop trigger={giggle}>
              <Pip mood={mood} size={empty ? 150 : 120} lift={total ? doneN / total : 0} />
            </PipBoop>
          </Pressable>
          {bubble ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: pipCentre + 64, top: 14 }}>
              <Bubble text={bubble} maxWidth={Math.min(168, width - (pipCentre + 64) - 14)} />
            </View>
          ) : null}
        </View>

        {recap && !empty ? <View style={{ paddingHorizontal: 20, marginBottom: 16 }}><RecapEntry recap={recap} /></View> : null}
        {empty ? (
          <Card edge={p.line} bg={p.surface} outerStyle={{ marginTop: 4, marginHorizontal: 20 }}
            style={{ paddingTop: 24, paddingHorizontal: 24, paddingBottom: 24, alignItems: 'center', gap: 8 }}>
            <Txt size={24} w={800} ls={-0.3} align="center">Nothing planted yet</Txt>
            <Txt size={15} w={400} color={p.secondary} lh={1.45} align="center" style={{ maxWidth: 270 }}>
              Start with one tiny habit. I’ll be here cheering for every single one.
            </Txt>
            <Button label="Plant your first habit" icon="plus" onPress={openAdd} style={{ marginTop: 16, alignSelf: 'stretch' }} />
            <Txt size={13} w={700} color={p.hint} style={{ marginTop: 8 }}>Two minutes a day is plenty.</Txt>
          </Card>
        ) : allRest ? (
          <RestDay habits={resting} />
        ) : (
          <View style={{ gap: 16, paddingHorizontal: 20 }}>{due.map(card)}</View>
        )}

        {thisWeek.length ? (
          <View style={{ marginTop: 24, gap: 12, paddingHorizontal: 20 }}>
            <Txt size={12} w={800} ls={0.5} caps color={p.hint}>This week · any day you like</Txt>
            <View style={{ gap: 16 }}>{thisWeek.map(card)}</View>
          </View>
        ) : null}

        {!allRest ? resting.map(h => <RestRow key={h.id} h={h} />) : null}
      </ScrollView>
      {sheet}
    </View>
  );
}

/** Pip's line for how the day is going. Scales with how many habits there are. */
function progressLine(done: number, total: number, hour: number): string {
  if (total === 0) return 'Nothing due right now.';
  if (done === 0) return total > 5 ? `${total} today. Start with the easiest?` : hour < 12 ? 'Morning! What’s first?' : 'What’s first?';
  if (total - done === 1) return 'One to go!';
  if (done === 1) return 'One down. Nice and easy.';
  if (done * 2 >= total && done * 2 - total <= 1) return 'Halfway there. Look at you.';
  return `${done} down, ${total - done} to go.`;
}

/** A quick squash-and-stretch when Pip is tapped. */
function PipBoop({ trigger, children }: { trigger: string | null; children: ReactNode }) {
  const sy = useSharedValue(1);
  useEffect(() => {
    if (!trigger) return;
    sy.value = withSequence(withTiming(0.92, { duration: 80 }), withTiming(1.06, { duration: 110 }), withTiming(1, { duration: 260, easing: springEase }));
  }, [trigger, sy]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: sy.value }, { scaleX: 2 - sy.value }] }));
  return <Animated.View style={[{ transformOrigin: 'bottom' }, style]}>{children}</Animated.View>;
}

/** Everything's resting today: say so, and show what's back next. */
function RestDay({ habits }: { habits: Habit[] }) {
  const p = usePalette();
  const { state, today } = useStore();
  const tomorrow = addDays(today, 1);
  const back = habits.filter(h => !isPausedOn(h, tomorrow) && ['due', 'progress', 'open'].includes(statusOn(state, h, tomorrow)));
  return (
    <Card edge={p.line} bg={p.surface} outerStyle={{ marginHorizontal: 20 }} style={{ padding: 24, alignItems: 'center', gap: 8 }}>
      <Txt size={22} w={800} ls={-0.3} align="center">Nothing due today</Txt>
      <Txt size={15} w={400} color={p.secondary} align="center" lh={1.4}>
        {back.length ? `Back tomorrow: ${back.map(h => h.name).join(', ')}.` : 'Rest is part of the rhythm.'}
      </Txt>
    </Card>
  );
}

/** Compact dashed row for habits resting today (or paused). */
function RestRow({ h }: { h: Habit }) {
  const p = usePalette();
  const { state, today } = useStore();
  const a = accentFor(h.color, p);
  const c = cardFor(state, h, today);
  const label = isPausedOn(h, today) ? 'Paused' : h.schedule.kind === 'week' ? 'Week done' : 'Rest day';
  return (
    <Pressable onPress={() => router.push(`/habit/${h.id}`)} accessibilityRole="button"
      accessibilityLabel={`${h.name}, ${label}. Streak ${c.streak} ${c.unit ? 'weeks' : 'days'}.`}
      style={{ marginTop: 16, marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: p.restLine }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: a.tint, alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}><Icon n={h.icon} c={a.base} s={18} /></View>
      <Txt size={15} w={700} color={p.secondary} style={{ flex: 1 }} numberOfLines={1}>{`${h.name} · ${label}`}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, opacity: 0.8 }}>
        <Icon n="flame" c={a.base} s={16} />
        <Txt size={15} w={900} color={a.ink}>{c.streak}</Txt>
        {c.unit ? <Txt size={11} w={800} color={a.ink}>{c.unit}</Txt> : null}
      </View>
      <Icon n="chevR" c={p.tertiary} s={18} />
    </Pressable>
  );
}

const pipHop = new Keyframe({
  0: { transform: [{ translateY: 60 }, { scale: 0.8 }], opacity: 0 },
  45: { transform: [{ translateY: -24 }, { scale: 1.05 }], opacity: 1, easing: springEaseFn },
  100: { transform: [{ translateY: 0 }, { scale: 1 }] },
}).duration(700).delay(380);

/**
 * 09 Perfect day. The first time today it plays in: gold wash, Pip hops and cheers, confetti,
 * then Pip settles to proud. Every visit after that shows the finished state, still.
 */
function PerfectDay({ due, resting, onUntap }: { due: Habit[]; resting: Habit[]; onUntap: (h: Habit) => void }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { state, today, markCelebrated } = useStore();
  const { burstAt } = useConfetti();
  const [animate] = useState(() => !state.celebrated.includes(today));
  const [proud, setProud] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    markCelebrated(today);
    const ts = [
      setTimeout(() => burstAt(width * 0.3, insets.top + 150, '#FF9F43'), 200),
      setTimeout(() => burstAt(width * 0.7, insets.top + 130, '#4DA8F0'), 500),
      setTimeout(() => burstAt(width * 0.5, insets.top + 110, '#A78BFA'), 800),
      setTimeout(() => setProud(true), 2500),
    ];
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = parseDay(today);
  const monthCount = monthDays(t.getFullYear(), t.getMonth()).filter(d => d <= today && isPerfectDay(state, d)).length;
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const ledge = p.dark ? p.line : GOLD.ledge;
  const enter = (ms: number, dur = 400) => (animate ? FadeIn.duration(dur).delay(ms) : undefined);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Animated.View entering={enter(0, 500)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
        <Gradient id="gold" stops={p.dark ? [[0, '#3B3417'], [0.5, '#221F14'], [1, p.bg]] : [[0, '#FFE7A0'], [0.38, '#FFF1C9'], [0.62, '#FFF8E6'], [1, p.bg]]} />
        <Hill top={insets.top + 196} height={300} bleed={110} color={p.dark ? '#2E2915' : '#FBDD8A'} />
        <Scatter n={10} cx={width / 2} cy={insets.top + 146} sx={200} sy={140} seed={3}
          colors={['#4DA8F0', '#FF9F43', '#A78BFA', '#FF7A6B', '#2EC4B6', '#58C27D', '#FFC83D']} />
      </Animated.View>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 136 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 44 }}>
          <Txt size={12} w={800} ls={0.6} caps color={p.headline}>{longDate(today)}</Txt>
          <DailyBadge done={due.length} total={due.length} />
        </View>
        <Animated.View entering={animate ? pipHop : undefined} style={{ height: 206, alignItems: 'center', paddingTop: 12 }}>
          <Pip mood={proud ? 'proud' : 'cheering'} size={150} />
        </Animated.View>
        <Animated.View entering={enter(700)} style={{ alignItems: 'center' }}>
          <Txt size={44} w={900} ls={-1.2} lh={1.05} align="center" accessibilityRole="header">Perfect day</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
            <Txt size={56} w={900} ls={-2} color={p.dark ? GOLD.base : GOLD.ink} style={{ lineHeight: 60 }}>{monthCount}</Txt>
            <Txt size={15} w={700} color={p.secondary}>{`perfect day${monthCount === 1 ? '' : 's'} in ${monthName(t.getMonth())}`}</Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }} accessibilityLabel="Last seven days">
            {week.map(d => {
              const on = isPerfectDay(state, d);
              return <View key={d} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: on ? GOLD.base : 'transparent', borderWidth: on ? 0 : 2, borderColor: p.dark ? p.line : GOLD.ledge }} />;
            })}
          </View>
        </Animated.View>
        <Animated.View entering={enter(900)}>
          <Card edge={ledge} bg={p.surface} outerStyle={{ marginTop: 24, marginHorizontal: 20 }} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
            {due.map((h, i) => {
              const a = accentFor(h.color, p);
              const streak = currentStreak(state, h, today);
              const at = state.logs[today]?.[h.id]?.t;
              return (
                <Pressable key={h.id} onPress={() => router.push(`/habit/${h.id}`)} onLongPress={() => onUntap(h)}
                  accessibilityRole="button" accessibilityLabel={`${h.name}, done. Streak ${streak}. Hold to undo.`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, borderBottomWidth: i < due.length - 1 ? 1.5 : 0, borderBottomColor: p.divider }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: a.tint, alignItems: 'center', justifyContent: 'center' }}><Icon n={h.icon} c={a.base} s={21} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt size={17} w={800} numberOfLines={1}>{h.name}</Txt>
                    {at != null ? <Txt size={13} w={700} color={a.ink}>{`Done · ${Math.floor(at / 60) % 12 || 12}:${String(at % 60).padStart(2, '0')} ${at < 720 ? 'am' : 'pm'}`}</Txt> : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Icon n="flame" c={a.base} s={16} />
                    <Txt size={16} w={900} color={a.ink}>{`${streak}${h.schedule.kind === 'week' ? 'wk' : ''}`}</Txt>
                  </View>
                  <View style={{ marginLeft: 4 }}><DoneCheck size={30} /></View>
                </Pressable>
              );
            })}
          </Card>
          {resting.map(h => (
            <View key={h.id} style={{ marginTop: 12, marginHorizontal: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon n={h.icon} c={ACCENTS[h.color].base} s={16} />
              <Txt size={14} w={700} color={p.hint}>{`${h.name} · ${isPausedOn(h, today) ? 'Paused' : cardFor(state, h, today).sub.replace(' · ', ', ')}`}</Txt>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const withStake = <T extends { streak: number }>(c: T, lost?: number): T => (lost != null && c.streak < lost ? { ...c, streak: lost } : c);
