import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Ledge';
import { DayToggles, Stepper } from '@/components/Controls';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { Timeline } from '@/screens/AddHabitSheet';
import { OnboardingHeader } from '@/screens/onboarding/Header';
import { useDraft } from '@/screens/onboarding/draft';
import { accentFor, LIGHT_ACCENTS } from '@/theme/colors';
import { usePalette } from '@/theme/ThemeProvider';
import { clockLabel, hourLabel } from '@/state/dates';
import type { Template } from '@/state/templates';
import type { Schedule } from '@/state/types';

const TIMES = [7 * 60, 7 * 60 + 30, 8 * 60, 12 * 60, 12 * 60 + 30, 18 * 60, 21 * 60, 22 * 60, 22 * 60 + 30];

/** 03 Set your rhythm — one compact card per chosen habit, showing only the control its schedule needs. */
export default function Rhythm() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { chosen } = useDraft();
  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <OnboardingHeader step={2} />
      <ScrollView contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}>
        <Txt size={32} w={900} ls={-0.8} style={{ paddingTop: 18, paddingHorizontal: 20 }} accessibilityRole="header">Set your rhythm</Txt>
        <Txt size={16} w={400} color={p.secondary} style={{ paddingTop: 4, paddingHorizontal: 20 }}>Small and steady. You can change this anytime.</Txt>
        <View style={{ paddingTop: 20, paddingHorizontal: 20, gap: 16 }}>
          {chosen.map(t => <RhythmCard key={t.id} t={t} />)}
        </View>
      </ScrollView>
      <Button label="Plant it" icon="sprout" onPress={() => router.push('/onboarding/notify')}
        style={{ position: 'absolute', left: 20, right: 20, bottom: Math.max(insets.bottom, 20) + 20 }} />
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
  const cycleTime = () => setDraft(d => {
    const cur = d.reminders[t.id] ?? 21 * 60;
    const next = TIMES[(TIMES.findIndex(x => x > cur) + TIMES.length) % TIMES.length] ?? TIMES[0];
    return { ...d, reminders: { ...d.reminders, [t.id]: next } };
  });

  const header = (right: ReactNode) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: a.tint, alignItems: 'center', justifyContent: 'center' }}><Icon n={t.icon} c={a.base} s={22} /></View>
      <Txt size={18} w={800} style={{ flex: 1 }} numberOfLines={1}>{t.name}</Txt>
      {right}
    </View>
  );
  const caps = (s: string) => <Txt size={11} w={800} ls={0.5} caps color={a.ink}>{s}</Txt>;

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
        {header(caps('Times per week'))}
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
        {header(
          <Pressable onPress={cycleTime} accessibilityRole="button" accessibilityLabel={`Reminder ${reminder != null ? clockLabel(reminder) : 'off'}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 14, backgroundColor: p.bg }}>
            <Icon n="bell" c={a.ink} s={14} />
            <Txt size={13} w={800}>{reminder != null ? clockLabel(reminder) : 'Off'}</Txt>
          </Pressable>,
        )}
        <DayToggles days={sch.days} base={a.base} edge={a.edge} size={38} onText={LIGHT_ACCENTS.includes(t.color) ? '#1F2A24' : '#FFFFFF'}
          onToggle={i => { const days = [...sch.days]; days[i] = !days[i]; if (days.some(Boolean)) setSch({ ...sch, days }); }} />
      </>
    );
  }

  return (
    <Card edge={a.edge} depth={4} bg={p.surface} style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
      {body}
    </Card>
  );
}
