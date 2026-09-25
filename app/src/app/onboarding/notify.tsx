import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Ledge';
import { Icon } from '@/components/Icon';
import { Pip } from '@/components/Pip';
import { Txt } from '@/components/Txt';
import { useAddHabit } from '@/screens/AddHabitSheet';
import { OnboardingHeader } from '@/screens/onboarding/Header';
import { CUSTOM_COLOR, useDraft } from '@/screens/onboarding/draft';
import { GREEN } from '@/theme/colors';
import { usePalette } from '@/theme/ThemeProvider';
import { askForReminders } from '@/state/reminders';
import { useStore } from '@/state/store';
import { guessIcon } from '@/state/templates';

/** 04 Notification permission — shown before the system prompt, so "Maybe later" costs nothing. */
export default function Notify() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { finishOnboarding, setSettings } = useStore();
  const { draft, chosen } = useDraft();
  const { openAdd } = useAddHabit();

  const { height } = useWindowDimensions();
  const small = height < 700;
  // The bell rings on its own, in ripples, so Pip's body stays planted.
  const ripple = useSharedValue(0);
  useEffect(() => {
    ripple.set(withDelay(400, withRepeat(withTiming(1, { duration: 900 }), 3, false)));
  }, [ripple]);
  const ring = useAnimatedStyle(() => ({ opacity: 1 - ripple.get(), transform: [{ scale: 0.6 + ripple.get() * 0.7 }] }));

  const finish = async (ask: boolean) => {
    const granted = ask ? await askForReminders() : false;
    setSettings({ notificationsAsked: ask, reminders: ask ? granted : false });
    const custom = draft.custom ? draft.customName.trim() : '';
    finishOnboarding([
      ...chosen.map(t => ({
        name: t.name, color: t.color, icon: t.icon, unit: t.unit,
        schedule: draft.schedules[t.id], reminder: draft.schedules[t.id].kind === 'thru' ? null : draft.reminders[t.id],
      })),
      ...(custom ? [{ name: custom, color: CUSTOM_COLOR, icon: guessIcon(custom) ?? 'sprout', schedule: { kind: 'day' as const, days: draft.customDays }, reminder: null }] : []),
    ]);
    router.replace('/');
    // Custom picked but never named (Pick → straight here): name it in the sheet.
    if (draft.custom && !custom) setTimeout(openAdd, 450);
  };

  const halo = small ? 220 : 270;
  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <OnboardingHeader step={3} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: small ? 4 : 18 }} bounces={false}>
        <View style={{ height: halo + 40, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', width: halo, height: halo, borderRadius: halo / 2, backgroundColor: p.dark ? '#2A2A1E' : '#FFF4D1' }} />
          <Animated.View style={[{ position: 'absolute', width: halo * 0.74, height: halo * 0.74, borderRadius: halo, borderWidth: 3, borderColor: p.dark ? '#4A4526' : '#FFE08A' }, ring]} />
          <View style={{ position: 'absolute', width: halo * 0.74, height: halo * 0.74, borderRadius: halo, backgroundColor: p.dark ? '#34321F' : '#FFEDB8' }} />
          <Pip mood="happy" prop="bell" size={small ? 150 : 190} />
        </View>
        <Txt size={small ? 30 : 34} w={900} ls={-0.8} align="center" style={{ paddingTop: 8, paddingHorizontal: 32 }} accessibilityRole="header">Can I nudge you?</Txt>
        <Txt size={16} w={400} lh={1.5} color={p.secondary} align="center" style={{ paddingTop: 12, paddingHorizontal: 40 }}>
          One gentle reminder when a habit is due. Only for the ones you pick, and never more than you ask for.
        </Txt>
        {small ? null : (
          <Card edge={p.line} bg={p.surface} radius={18} outerStyle={{ marginTop: 22, marginHorizontal: 28 }}
            style={{ paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: GREEN.tint, alignItems: 'center', justifyContent: 'center' }}><Icon n="sprout" c={GREEN.primary} s={22} /></View>
            <View style={{ flex: 1 }}>
              <Txt size={14} w={800}>Glass #5 time 💧</Txt>
              <Txt size={13} w={400} color={p.secondary}>Halfway there. Small sips count.</Txt>
            </View>
            <Txt size={12} w={700} color={p.tertiary}>now</Txt>
          </Card>
        )}
        <View style={{ flex: 1, minHeight: 24 }} />
        <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 20) + 12, gap: 12 }}>
          <Button label="Yes, nudge me" onPress={() => finish(true)} />
          <Button label="Maybe later" variant="secondary" onPress={() => finish(false)} />
        </View>
      </ScrollView>
    </View>
  );
}
