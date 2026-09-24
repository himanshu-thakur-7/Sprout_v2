import { Stack } from 'expo-router';
import { OnboardingDraftProvider } from '@/screens/onboarding/draft';
import { usePalette } from '@/theme/ThemeProvider';

export default function OnboardingLayout() {
  const p = usePalette();
  return (
    <OnboardingDraftProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg }, animation: 'slide_from_right' }} />
    </OnboardingDraftProvider>
  );
}
