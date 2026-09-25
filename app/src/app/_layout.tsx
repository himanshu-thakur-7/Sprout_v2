import {
  Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, useFonts,
} from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ToastProvider, useToast } from '@/components/Toast';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AddHabitProvider } from '@/screens/AddHabitSheet';
import { useReminderSync } from '@/state/reminders';
import { useWidgetSync } from '@/widgets/sync';
import { StoreProvider, useStore } from '@/state/store';
import { ThemeProvider, usePalette } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Themed fontsLoaded={fontsLoaded} />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function Themed({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { state, ready, today } = useStore();
  useReminderSync(state, ready, today);
  useWidgetSync(state, ready, today);
  const show = fontsLoaded && ready;
  useEffect(() => { if (show) SplashScreen.hideAsync().catch(() => {}); }, [show]);
  if (!show) return null;
  return (
    <ThemeProvider pref={state.settings.theme}>
      <ToastProvider>
        <AddHabitProvider>
          <Navigator />
          <SaveWatcher />
        </AddHabitProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

/** A failed save shows up as a gentle toast instead of disappearing silently. */
function SaveWatcher() {
  const { saveFailed } = useStore();
  const { show } = useToast();
  useEffect(() => {
    if (saveFailed) show({ text: 'I couldn’t save that. I’ll keep trying.', mood: 'droopy', ms: 5000 });
  }, [saveFailed, show]);
  return null;
}

function Navigator() {
  const p = usePalette();
  const { state } = useStore();
  return (
    <>
      <StatusBar style={p.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }}>
        <Stack.Protected guard={state.onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="habit/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="recap" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={!state.onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
