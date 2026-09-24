import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Ledge';
import { Icon } from '@/components/Icon';
import { Pip } from '@/components/Pip';
import { Txt } from '@/components/Txt';
import { useAddHabit } from '@/screens/AddHabitSheet';
import { useDraft } from '@/screens/onboarding/draft';
import { GREEN } from '@/theme/colors';
import { usePalette } from '@/theme/ThemeProvider';
import { askForReminders } from '@/state/reminders';
import { useStore } from '@/state/store';

/** 04 Notification permission — shown before the system prompt, so "Maybe later" costs nothing. */
export default function Notify() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { finishOnboarding, setSettings } = useStore();
  const { draft, chosen } = useDraft();
  const { openAdd } = useAddHabit();

  // Pip rings the bell twice (2 × 300 ms wobble).
  const wobble = useSharedValue(0);
  useEffect(() => {
    wobble.value = withDelay(400, withRepeat(withSequence(
      withTiming(-8, { duration: 75 }), withTiming(8, { duration: 150 }), withTiming(0, { duration: 75 }),
    ), 2));
  }, [wobble]);
  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${wobble.value}deg` }] }));

  const finish = async (ask: boolean) => {
    const granted = ask ? await askForReminders() : false;
    setSettings({ notificationsAsked: ask, reminders: ask ? granted : true });
    finishOnboarding(chosen.map(t => ({
      name: t.name, color: t.color, icon: t.icon, unit: t.unit,
      schedule: draft.schedules[t.id], reminder: draft.schedules[t.id].kind === 'thru' ? null : draft.reminders[t.id],
    })));
    router.replace('/');
    if (draft.custom) setTimeout(openAdd, 450);
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top + 30 }}>
      <View style={{ height: 340, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: 270, height: 270, borderRadius: 135, backgroundColor: p.dark ? '#2A2A1E' : '#FFF4D1' }} />
        <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: p.dark ? '#34321F' : '#FFEDB8' }} />
        <Animated.View style={ring}><Pip mood="happy" prop="bell" size={190} /></Animated.View>
      </View>
      <Txt size={34} w={900} ls={-0.8} align="center" style={{ paddingTop: 20, paddingHorizontal: 32 }} accessibilityRole="header">Can I nudge you?</Txt>
      <Txt size={16} w={400} lh={1.5} color={p.secondary} align="center" style={{ paddingTop: 12, paddingHorizontal: 40 }}>
        One gentle reminder when a habit is due. Only for the ones you pick, and never more than you ask for.
      </Txt>
      <Card edge={p.line} bg={p.surface} radius={18} outerStyle={{ marginTop: 22, marginHorizontal: 28 }}
        style={{ paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: GREEN.tint, alignItems: 'center', justifyContent: 'center' }}><Icon n="sprout" c={GREEN.primary} s={22} /></View>
        <View style={{ flex: 1 }}>
          <Txt size={14} w={800}>Glass #5 time 💧</Txt>
          <Txt size={13} w={400} color={p.secondary}>Halfway there. Small sips count.</Txt>
        </View>
        <Txt size={12} w={700} color={p.tertiary}>now</Txt>
      </Card>
      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 20) + 20, gap: 14 }}>
        <Button label="Yes, nudge me" onPress={() => finish(true)} />
        <Button label="Maybe later" variant="secondary" onPress={() => finish(false)} />
      </View>
    </View>
  );
}
