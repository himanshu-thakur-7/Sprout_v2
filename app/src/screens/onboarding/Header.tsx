import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { StepDots } from '@/components/Controls';
import { Icon } from '@/components/Icon';
import { usePalette } from '@/theme/ThemeProvider';

/** Back arrow · step dots · spacer. */
export function OnboardingHeader({ step }: { step: number }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingHorizontal: 20, height: 44 }}>
      <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
        <Icon n="arrowL" c={p.secondary} s={24} />
      </Pressable>
      <StepDots step={step} />
      <View style={{ width: 24 }} />
    </View>
  );
}
