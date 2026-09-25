import { Tabs } from 'expo-router';
import { BottomNav, type NavTab } from '@/components/BottomNav';
import { useAddHabit } from '@/screens/AddHabitSheet';
import { usePalette } from '@/theme/ThemeProvider';

const ROUTE: Record<NavTab, string> = { today: 'index', progress: 'progress', you: 'you' };

export default function TabsLayout() {
  const p = usePalette();
  const { openAdd } = useAddHabit();
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: p.bg }, animation: 'fade' }}
      tabBar={({ state, navigation }) => {
        const current = state.routes[state.index]?.name;
        const active = (Object.keys(ROUTE) as NavTab[]).find(k => ROUTE[k] === current) ?? 'today';
        return <BottomNav active={active} onNav={t => navigation.navigate(ROUTE[t])} onFab={active === 'you' ? undefined : openAdd} />;
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="you" options={{ title: 'You' }} />
    </Tabs>
  );
}
