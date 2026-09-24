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
import { confirm } from '@/utils/confirm';

/** 01 Welcome */
export default function Welcome() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { loadDemo } = useStore();

  const haveAccount = async () => {
    if (await confirm('Accounts are coming soon', 'Sprout keeps everything on this phone for now. Want to look around a sample garden instead?', 'Show me')) loadDemo();
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, overflow: 'hidden' }}>
      <Hill top={height - 292} color={p.fill} height={520} bleed={120} />
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <Txt size={38} w={900} ls={-1} lh={1.08} align="center" style={{ paddingTop: 70, paddingHorizontal: 32 }} accessibilityRole="header">
          Hey. Let’s build something small.
        </Txt>
        <Txt size={16} w={400} color={p.secondary} lh={1.45} align="center" style={{ paddingTop: 14, paddingHorizontal: 40 }}>
          Tiny habits, honest streaks, and one small seed rooting for you.
        </Txt>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 }}>
          <View style={{ position: 'absolute', left: 84, top: 48 }}><Icon n="sparkle" c={GOLD.base} s={20} /></View>
          <View style={{ position: 'absolute', right: 78, top: 96 }}><Icon n="sparkle" c={GOLD.base} s={14} /></View>
          <Animated.View entering={ZoomIn.duration(500).easing(springEaseFn)}>
            <Pip mood="waving" size={200} />
          </Animated.View>
        </View>
        <View style={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 20) + 20, alignItems: 'center', gap: 18 }}>
          <StepDots step={0} />
          <Button label="Let's go." onPress={() => router.push('/onboarding/pick')} style={{ alignSelf: 'stretch' }} />
          <Pressable onPress={haveAccount} hitSlop={10} accessibilityRole="button">
            <Txt size={15} w={800} color={p.headline}>I already have an account</Txt>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
