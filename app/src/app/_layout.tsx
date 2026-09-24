import {
  Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, useFonts,
} from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AddHabitProvider } from '@/screens/AddHabitSheet';
import { useReminderSync } from '@/state/reminders';
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
  const { state, ready } = useStore();
  useReminderSync(state, ready);
  const show = fontsLoaded && ready;
  useEffect(() => { if (show) SplashScreen.hideAsync().catch(() => {}); }, [show]);
  if (!show) return null;
  return (
    <ThemeProvider pref={state.settings.theme}>
      <AddHabitProvider>
        <Navigator />
      </AddHabitProvider>
    </ThemeProvider>
  );
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
        </Stack.Protected>
        <Stack.Protected guard={!state.onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
