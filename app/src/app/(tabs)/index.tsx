import { router } from 'expo-router';
import { createRef, useEffect, useRef, useState, type RefObject } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOutUp, Keyframe } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gradient, Hill } from '@/components/Backdrop';
import { Button } from '@/components/Button';
import { ConfettiLayer, Scatter, useConfetti } from '@/components/Confetti';
import { Bubble, DailyBadge } from '@/components/Controls';
import { HabitCard } from '@/components/HabitCard';
import { Icon } from '@/components/Icon';
import { Card } from '@/components/Ledge';
import { Pip, type PipMood } from '@/components/Pip';
import { Txt } from '@/components/Txt';
import { useAddHabit } from '@/screens/AddHabitSheet';
import { SlipSheet } from '@/screens/SlipSheet';
import { ACCENTS, accentFor, GOLD, GREEN } from '@/theme/colors';
import { springEaseFn } from '@/theme/motion';
import { usePalette } from '@/theme/ThemeProvider';
import { longDate, parseDay } from '@/state/dates';
import { currentStreak, dueOn, findSlip, isDone, isPerfectDay, liveHabits, monthDays, statusOn } from '@/state/logic';
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

const pipHop = new Keyframe({
  0: { transform: [{ translateY: 60 }, { scale: 0.8 }], opacity: 0 },
  45: { transform: [{ translateY: -24 }, { scale: 1.05 }], opacity: 1, easing: springEaseFn },
  100: { transform: [{ translateY: 0 }, { scale: 1 }] },
}).duration(700).delay(380);

function Today() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { state, today, now, tap, untap } = useStore();
  const { burstFrom } = useConfetti();
  const { openAdd } = useAddHabit();

  const live = liveHabits(state, today);
  const active = live.filter(h => !h.paused);
  const due = dueOn(state, today);
  const resting = [...active.filter(h => statusOn(state, h, today) === 'rest'), ...live.filter(h => h.paused)];
  const doneN = due.filter(h => isDone(state, h, today)).length;
  const total = due.length;
  const empty = live.length === 0;
  const perfect = isPerfectDay(state, today);
  const hour = now.getHours();
  const evening = hour >= 20 && !p.dark;

  // Streak slips: shown once per missed period until the person decides.
  const [snoozed, setSnoozed] = useState<string[]>([]);
  const slip = active.map(h => findSlip(state, h, today)).find(s => s && !snoozed.includes(s.key)) ?? null;

  // Pip cheers for a beat after each check-off, then settles.
  const [cheer, setCheer] = useState(false);
  const [landed, setLanded] = useState<string | null>(null);
  const cheerT = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(cheerT.current), []);

  const refs = useRef<Record<string, RefObject<View | null>>>({});
  const refFor = (id: string) => (refs.current[id] ??= createRef<View>());

  const onTap = (h: Habit) => {
    const completed = tap(h.id);
    if (completed) {
      successHaptic();
      burstFrom(refFor(h.id), ACCENTS[h.color].base);
      setLanded(h.id);
      setCheer(true);
      clearTimeout(cheerT.current);
      cheerT.current = setTimeout(() => setCheer(false), 700);
    } else tapHaptic();
  };

  let mood: PipMood = 'expectant';
  if (!empty) {
    if (slip) mood = 'droopy';
    else if (cheer || perfect) mood = 'cheering';
    else if ((hour >= 23 || hour < 5) && doneN < total) mood = 'sleepy';
    else if (evening && doneN < total) mood = 'droopy';
    else if (doneN > 0) mood = 'happy';
  }
  const bubble = empty ? 'Hi! I’m Pip.'
    : evening && doneN < total ? 'Still time for a couple. No rush.'
      : total === 0 ? 'Rest day. Enjoy it.'
        : doneN === 0 ? (hour < 12 ? 'Morning! What’s first?' : 'What’s first?')
          : total - doneN === 1 ? 'One to go!'
            : doneN === 1 ? 'One down. Nice and easy.'
              : doneN * 2 >= total ? 'Halfway there. Look at you.' : 'Nice and steady.';

  const dateColor = evening ? '#4D5F74' : p.headline;
  const hill = p.dark ? p.fill : evening ? '#ECE3D5' : p.fill;

  const sheet = <SlipSheet key="slip-sheet" slip={slip} onLater={k => setSnoozed(s => [...s, k])} />;

  if (perfect && !slip) {
    return (
      <View style={{ flex: 1, backgroundColor: p.bg }}>
        <PerfectDay due={due} resting={resting} onUntap={id => untap(id)} />
        {sheet}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      {evening ? <Gradient id="dusk" stops={[[0, '#D3DAE3'], [0.24, '#E2E2E1'], [0.44, '#F4EFE7'], [0.6, '#FBF7F0']]} /> : null}
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Hill top={insets.top + (empty ? 196 : 146)} color={hill} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 44 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {evening ? <Icon n="moon" c="#6D7E93" s={14} /> : null}
            <Txt size={12} w={800} ls={0.6} caps color={dateColor} accessibilityRole="header">{longDate(today)}</Txt>
          </View>
          {!empty ? <DailyBadge done={doneN} total={total} /> : null}
        </View>
        <View style={{ height: empty ? 212 : 168 }}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center' }}><Pip mood={mood} size={empty ? 150 : 120} /></View>
          {bubble ? <View style={{ position: 'absolute', left: width / 2 + 61, top: 20 }}><Bubble text={bubble} /></View> : null}
        </View>

        {empty ? (
          <Card edge={p.line} bg={p.surface} outerStyle={{ marginTop: 4, marginHorizontal: 20 }}
            style={{ paddingTop: 26, paddingHorizontal: 22, paddingBottom: 22, alignItems: 'center', gap: 8 }}>
            <Txt size={24} w={800} ls={-0.3} align="center">Nothing planted yet</Txt>
            <Txt size={15} w={400} color={p.secondary} lh={1.45} align="center" style={{ maxWidth: 270 }}>
              Start with one tiny habit. I’ll be here cheering for every single one.
            </Txt>
            <Button label="Plant your first habit" icon="plus" onPress={openAdd} style={{ marginTop: 14, alignSelf: 'stretch' }} />
            <Txt size={13} w={700} color={p.tertiary} style={{ marginTop: 6 }}>Two minutes a day is plenty.</Txt>
          </Card>
        ) : (
          <View style={{ gap: 16, paddingHorizontal: 20 }}>
            {due.map((h, i) => (
              <Animated.View key={h.id} exiting={FadeOutUp.delay(i * 40).duration(380)}>
                <HabitCard ref={refFor(h.id)} {...cardFor(state, h, today)} celebrate={landed === h.id} onTap={() => onTap(h)} onLongPress={() => router.push(`/habit/${h.id}`)} />
              </Animated.View>
            ))}
          </View>
        )}

        {resting.map(h => <RestRow key={h.id} h={h} />)}
        {!empty && due.length > 0 ? (
          <Txt size={12} w={700} color={p.tertiary} align="center" style={{ marginTop: 18 }}>Tap to log · hold for details</Txt>
        ) : null}
      </ScrollView>
      {sheet}
    </View>
  );
}

/** Compact dashed row for habits resting today (or paused). */
function RestRow({ h }: { h: Habit }) {
  const p = usePalette();
  const { state, today } = useStore();
  const a = accentFor(h.color, p);
  const c = cardFor(state, h, today);
  const label = h.paused ? 'Paused' : h.schedule.kind === 'week' ? 'Week done' : 'Rest day';
  return (
    <Pressable onPress={() => router.push(`/habit/${h.id}`)} accessibilityRole="button" accessibilityLabel={`${h.name}, ${label}`}
      style={{ marginTop: 18, marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: p.restLine }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: a.tint, alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}><Icon n={h.icon} c={a.base} s={18} /></View>
      <Txt size={15} w={700} color={p.secondary} style={{ flex: 1 }} numberOfLines={1}>{`${h.name} · ${label}`}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, opacity: 0.8 }}>
        <Icon n="flame" c={a.base} s={16} />
        <Txt size={15} w={900} color={a.ink}>{c.streak}</Txt>
        {c.unit ? <Txt size={10} w={800} color={a.ink}>{c.unit}</Txt> : null}
      </View>
      <Icon n="chevR" c={p.tertiary} s={18} />
    </Pressable>
  );
}

/** 09 Perfect day: the golden wash, Pip centre stage, and a compact struck-through list. */
function PerfectDay({ due, resting, onUntap }: { due: Habit[]; resting: Habit[]; onUntap: (id: string) => void }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { state, today } = useStore();
  const t = parseDay(today);
  const perfectThisMonth = monthDays(t.getFullYear(), t.getMonth()).filter(d => d <= today && isPerfectDay(state, d)).length;
  const ledge = p.dark ? p.line : GOLD.ledge;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Animated.View entering={FadeIn.duration(600).delay(200)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
        <Gradient id="gold" stops={p.dark ? [[0, '#3B3417'], [0.5, '#221F14'], [1, p.bg]] : [[0, '#FFE7A0'], [0.38, '#FFF1C9'], [0.62, '#FFF8E6'], [1, '#FBF7F0']]} />
        <Hill top={insets.top + 196} height={300} bleed={110} color={p.dark ? '#2E2915' : '#FBDD8A'} />
        <Scatter n={34} cx={width / 2} cy={insets.top + 146} sx={190} sy={130} seed={3}
          colors={['#4DA8F0', '#FF9F43', '#A78BFA', '#FF7A6B', '#2EC4B6', '#58C27D', '#FFC83D']} />
      </Animated.View>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 44 }}>
          <Txt size={12} w={800} ls={0.6} caps color={p.headline}>{longDate(today)}</Txt>
          <DailyBadge done={due.length} total={due.length} />
        </View>
        <Animated.View entering={pipHop} style={{ height: 218, alignItems: 'center', paddingTop: 12 }}>
          <Pip mood="cheering" size={150} />
        </Animated.View>
        <Animated.View entering={FadeIn.duration(400).delay(700)}>
          <Txt size={44} w={900} ls={-1.2} lh={1.05} align="center" style={{ marginTop: 4 }} accessibilityRole="header">Perfect day</Txt>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Txt size={16} w={600} color={p.secondary}>{`${perfectThisMonth} perfect day${perfectThisMonth === 1 ? '' : 's'} this month`}</Txt>
            <Icon n="sparkle" c={GOLD.base} s={16} />
          </View>
        </Animated.View>
        <Animated.View entering={FadeIn.duration(400).delay(900)}>
          <Card edge={ledge} bg={p.surface} outerStyle={{ marginTop: 22, marginHorizontal: 20 }} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
            {due.map((h, i) => {
              const a = accentFor(h.color, p);
              const streak = currentStreak(state, h, today);
              return (
                <Pressable key={h.id} onPress={() => onUntap(h.id)} onLongPress={() => router.push(`/habit/${h.id}`)}
                  accessibilityRole="checkbox" accessibilityState={{ checked: true }} accessibilityLabel={`${h.name}, done. Tap to undo.`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: 58, borderBottomWidth: i < due.length - 1 ? 1.5 : 0, borderBottomColor: p.divider }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: a.tint, alignItems: 'center', justifyContent: 'center' }}><Icon n={h.icon} c={a.base} s={21} /></View>
                  <Txt size={17} w={800} color={p.secondary} strike={p.tertiary} style={{ flex: 1 }} numberOfLines={1}>{h.name}</Txt>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Icon n="flame" c={a.base} s={16} />
                    <Txt size={15} w={900} color={a.ink}>{`${streak}${h.schedule.kind === 'week' ? 'wk' : ''}`}</Txt>
                  </View>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: GREEN.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}><Icon n="check" c="#fff" s={18} /></View>
                </Pressable>
              );
            })}
          </Card>
          {resting.map(h => (
            <View key={h.id} style={{ marginTop: 12, marginHorizontal: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon n={h.icon} c={ACCENTS[h.color].base} s={16} />
              <Txt size={14} w={700} color="#8C887F">{`${h.name} · ${h.paused ? 'Paused' : cardFor(state, h, today).sub.replace(' · ', ', ')}`}</Txt>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
