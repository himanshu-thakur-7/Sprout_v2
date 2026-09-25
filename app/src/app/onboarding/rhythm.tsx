import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Ledge';
import { DayToggles, Stepper } from '@/components/Controls';
import { Icon } from '@/components/Icon';
import { FONT, Txt } from '@/components/Txt';
import { Timeline } from '@/screens/AddHabitSheet';
import { OnboardingHeader } from '@/screens/onboarding/Header';
import { CUSTOM_COLOR, useDraft } from '@/screens/onboarding/draft';
import { accentFor, GREEN, onAccent } from '@/theme/colors';
import { usePalette } from '@/theme/ThemeProvider';
import { clockLabel, hourLabel } from '@/state/dates';
import { guessIcon, type Template } from '@/state/templates';
import type { Schedule } from '@/state/types';

const PRESETS: [string, number][] = [['Morning', 7 * 60 + 30], ['Midday', 12 * 60 + 30], ['Evening', 21 * 60]];

/** 03 Set your rhythm — one compact card per chosen habit, showing only the control its schedule needs. */
export default function Rhythm() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { chosen, draft } = useDraft();
  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <OnboardingHeader step={2} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <Txt size={32} w={900} ls={-0.8} style={{ paddingTop: 18, paddingHorizontal: 20 }} accessibilityRole="header">Set your rhythm</Txt>
        <Txt size={16} w={400} color={p.secondary} style={{ paddingTop: 4, paddingHorizontal: 20 }}>Small and steady. You can change this anytime.</Txt>
        <View style={{ paddingTop: 20, paddingHorizontal: 20, gap: 16 }}>
          {chosen.map(t => <RhythmCard key={t.id} t={t} />)}
          {draft.custom ? <CustomCard /> : null}
        </View>
      </ScrollView>
      {/* Footer: the button sits on the page colour, with a short fade so cards slide under it cleanly. */}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <Svg width="100%" height={24} pointerEvents="none">
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={p.bg} stopOpacity={0} />
              <Stop offset="1" stopColor={p.bg} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height={24} fill="url(#fade)" />
        </Svg>
        <View style={{ backgroundColor: p.bg, paddingTop: 4, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 20) + 12 }}>
          <Button label="Plant it" icon="sprout" onPress={() => router.push('/onboarding/notify')} />
        </View>
      </View>
    </View>
  );
}

function RhythmCard({ t }: { t: Template }) {
  const p = usePalette();
  const a = accentFor(t.color, p);
  const { draft, setDraft } = useDraft();
  const sch = draft.schedules[t.id];
  const reminder = draft.reminders[t.id];
  const setSch = (s: Schedule) => setDraft(d => ({ ...d, schedules: { ...d.schedules, [t.id]: s } }));
  const setReminder = (r: number | null) => setDraft(d => ({ ...d, reminders: { ...d.reminders, [t.id]: r } }));
  const [timeOpen, setTimeOpen] = useState(false);
  const [needDay, setNeedDay] = useState(0);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const toggleDay = (i: number) => {
    if (sch.kind !== 'day') return;
    const days = [...sch.days]; days[i] = !days[i];
    if (days.some(Boolean)) { setSch({ ...sch, days }); setNeedDay(0); return; }
    // The last day can't go: wiggle and say why.
    shake.set(withSequence(withTiming(-6, { duration: 60 }), withTiming(6, { duration: 80 }), withTiming(-4, { duration: 70 }), withTiming(0, { duration: 70 })));
    setNeedDay(n => n + 1);
  };
  const timeChip = (
    <Pressable onPress={() => setTimeOpen(o => !o)} accessibilityRole="button" accessibilityLabel={`Reminder ${reminder != null ? clockLabel(reminder) : 'off'}. Change`} hitSlop={6}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: p.bg, borderWidth: 1.5, borderColor: timeOpen ? a.base : p.line }}>
      <Icon n="bell" c={a.ink} s={14} />
      <Txt size={13} w={800}>{reminder != null ? clockLabel(reminder) : 'Off'}</Txt>
      <Icon n={timeOpen ? 'chevD' : 'chevR'} c={p.tertiary} s={12} />
    </Pressable>
  );
  const timePanel = timeOpen ? (
    <View style={{ gap: 10, alignItems: 'center', paddingTop: 2 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        <TimeChip label="Off" on={reminder == null} onPress={() => setReminder(null)} />
        {PRESETS.map(([l, v]) => <TimeChip key={l} label={l} on={reminder === v} onPress={() => setReminder(v)} />)}
      </View>
      <Stepper size={36} minWidth={110} value={1} min={0} max={2} label={reminder != null ? clockLabel(reminder) : 'Pick a time'}
        onDown={() => setReminder(((reminder ?? 9 * 60) - 15 + 1440) % 1440)} onUp={() => setReminder(((reminder ?? 9 * 60) + 15) % 1440)} />
    </View>
  ) : null;

  const header = (right: ReactNode) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: a.tint, alignItems: 'center', justifyContent: 'center' }}><Icon n={t.icon} c={a.base} s={22} /></View>
      <Txt size={18} w={800} style={{ flex: 1 }} numberOfLines={1}>{t.name}</Txt>
      {right}
    </View>
  );
  const caps = (s: string) => <Txt size={11} w={800} ls={0.5} caps color={p.label}>{s}</Txt>;

  let body: ReactNode = null;
  if (sch.kind === 'thru') {
    const n = Math.floor((sch.endHour - sch.startHour) / sch.intervalHours) + 1;
    body = (
      <>
        {header(caps('Throughout the day'))}
        <Timeline n={n} base={a.base} tint={a.tint} end={16} mid={9} halo={0} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt size={12} w={700} color={p.secondary}>{`${hourLabel(sch.startHour)} – ${hourLabel(sch.endHour)}`}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Stepper size={32} minWidth={108} value={sch.intervalHours} min={1} max={4}
              onDown={() => setSch({ ...sch, intervalHours: Math.max(1, sch.intervalHours - 1) })}
              onUp={() => setSch({ ...sch, intervalHours: Math.min(4, sch.intervalHours + 1) })}>
              <Txt size={14} w={800}>{`Every ${sch.intervalHours} hour${sch.intervalHours > 1 ? 's' : ''}`}</Txt>
            </Stepper>
          </View>
        </View>
      </>
    );
  } else if (sch.kind === 'week') {
    body = (
      <>
        {header(timeChip)}
        {timePanel}
        {caps('Times per week')}
        <View style={{ alignItems: 'center' }}>
          <Stepper minWidth={130} value={sch.perWeek} min={1} max={6}
            onDown={() => setSch({ ...sch, perWeek: Math.max(1, sch.perWeek - 1) })}
            onUp={() => setSch({ ...sch, perWeek: Math.min(6, sch.perWeek + 1) })}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Txt size={40} w={900} ls={-1} color={a.ink} style={{ lineHeight: 44 }}>{sch.perWeek}</Txt>
              <Txt size={15} w={700} color={p.secondary}>{sch.perWeek > 1 ? 'times a week' : 'time a week'}</Txt>
            </View>
          </Stepper>
        </View>
        <Txt size={13} w={400} color={p.secondary} align="center">Any days you like. Streak counts in weeks.</Txt>
      </>
    );
  } else {
    body = (
      <>
        {header(timeChip)}
        {timePanel}
        <Animated.View style={shakeStyle}>
          <DayToggles days={sch.days} base={a.base} edge={a.edge} onText={onAccent(t.color)} onToggle={toggleDay} />
        </Animated.View>
        {needDay ? <Txt size={13} w={800} color="#D9533F" align="center">At least one day</Txt> : null}
      </>
    );
  }

  return (
    <Card edge={a.edge} depth={4} bg={p.surface} style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
      {body}
    </Card>
  );
}

function TimeChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} hitSlop={4}
      style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? GREEN.primary : p.fill }}>
      <Txt size={14} w={800} color={on ? '#1F2A24' : p.secondary}>{label}</Txt>
    </Pressable>
  );
}

/** The Custom tile, named right here instead of in a sheet that pops up later. */
function CustomCard() {
  const p = usePalette();
  const a = accentFor(CUSTOM_COLOR, p);
  const { draft, setDraft } = useDraft();
  const icon = guessIcon(draft.customName) ?? 'sprout';
  return (
    <Card edge={a.edge} depth={4} bg={p.surface} style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: a.tint, alignItems: 'center', justifyContent: 'center' }}><Icon n={icon} c={a.base} s={22} /></View>
        <TextInput value={draft.customName} onChangeText={t => setDraft(d => ({ ...d, customName: t.slice(0, 40) }))} placeholder="Name your own habit" placeholderTextColor={p.hint}
          accessibilityLabel="Custom habit name" returnKeyType="done" selectionColor={a.base}
          style={[{ flex: 1, fontFamily: FONT[800], fontSize: 18, color: p.ink, paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: draft.customName ? 'transparent' : a.tint }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]} />
      </View>
      <DayToggles days={draft.customDays} base={a.base} edge={a.edge} onText={onAccent(CUSTOM_COLOR)}
        onToggle={i => setDraft(d => { const days = [...d.customDays]; days[i] = !days[i]; return days.some(Boolean) ? { ...d, customDays: days } : d; })} />
      <Txt size={13} w={400} color={p.secondary} align="center">{draft.customName.trim() ? 'You can fine-tune it later.' : 'Leave it blank and I’ll ask once you’re in.'}</Txt>
    </Card>
  );
}
