import { router } from 'expo-router';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Hill } from '@/components/Backdrop';
import { Button } from '@/components/Button';
import { StepDots } from '@/components/Controls';
import { Icon } from '@/components/Icon';
import { Pip } from '@/components/Pip';
import { Txt } from '@/components/Txt';
import { GOLD } from '@/theme/colors';
import { springEaseFn } from '@/theme/motion';
import { usePalette } from '@/theme/ThemeProvider';
import { useStore } from '@/state/store';

/** 01 Welcome */
export default function Welcome() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { loadDemo } = useStore();


  return (
    <View style={{ flex: 1, backgroundColor: p.bg, overflow: 'hidden' }}>
      <Hill top={height - 292} color={p.dark ? p.fill : '#EADBC3'} height={520} bleed={120} />
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <Txt size={38} w={900} ls={-1} lh={1.08} align="center" style={{ paddingTop: 70, paddingHorizontal: 32 }} accessibilityRole="header">
          Hey. Let’s build something small.
        </Txt>
        <Txt size={16} w={400} color={p.secondary} lh={1.45} align="center" style={{ paddingTop: 14, paddingHorizontal: 40 }}>
          Tiny habits, honest streaks, and one small seed rooting for you.
        </Txt>
        {/* Pip sits in the middle of the free space, sparkles in orbit. */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}>
          <Animated.View entering={ZoomIn.duration(500).easing(springEaseFn)}>
            <View style={{ position: 'absolute', left: -34, top: 26 }}><Icon n="sparkle" c={GOLD.base} s={22} /></View>
            <View style={{ position: 'absolute', right: -40, top: 70 }}><Icon n="sparkle" c={GOLD.base} s={15} /></View>
            <View style={{ position: 'absolute', right: -22, top: -4 }}><Icon n="sparkle" c={GOLD.glow} s={11} /></View>
            <Pip mood="waving" size={height < 700 ? 180 : 230} />
          </Animated.View>
        </View>
        <View style={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 20) + 20, alignItems: 'center', gap: 18 }}>
          <StepDots step={0} />
          <Button label="Let’s go." onPress={() => router.push('/onboarding/pick')} style={{ alignSelf: 'stretch' }} />
          <Pressable onPress={loadDemo} hitSlop={10} accessibilityRole="button" accessibilityHint="Opens a sample garden with made-up habits">
            <Txt size={15} w={800} color={p.headline}>Just looking? Explore a sample garden</Txt>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
