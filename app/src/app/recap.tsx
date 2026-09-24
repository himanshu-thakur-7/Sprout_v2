import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Share, View } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeIn, runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';
import { StoryCard, storyTheme } from '@/screens/StoryCard';
import { usePalette } from '@/theme/ThemeProvider';
import { weekRange } from '@/state/dates';
import { buildRecap } from '@/state/recap';
import { useStore } from '@/state/store';

const AUTO_MS = 5000;

/** 17–21 Weekly recap player. Cards auto-advance after 5 s; tap to skip ahead. */
export default function RecapScreen() {
  const p = usePalette();
  const { state, today, markRecapSeen } = useStore();
  const recap = useMemo(() => buildRecap(state, today), [state, today]);
  const [i, setI] = useState(0);
  const progress = useSharedValue(0);

  const total = recap ? recap.cards.length + 1 : 0;
  const final = i === total - 1;

  useEffect(() => { if (recap) markRecapSeen(recap.week); }, [recap, markRecapSeen]);

  useEffect(() => {
    progress.value = 0;
    if (!recap || final) { progress.value = 1; return; }
    progress.value = withTiming(1, { duration: AUTO_MS, easing: Easing.linear }, done => { if (done) runOnJS(setI)(i + 1); });
    return () => cancelAnimation(progress);
  }, [i, final, recap, progress]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!recap) {
    return <View style={{ flex: 1, backgroundColor: p.bg }} />;
  }

  const share = () => {
    const lines = recap.cards.map(c => `${c.habit.name}: ${c.big}`).join('\n');
    Share.share({ message: `My week in Sprout (${weekRange(recap.week)}) 🌱\n${recap.kept} habits kept.\n${lines}` }).catch(() => {});
  };

  const card = recap.cards[i];
  return (
    <Animated.View key={i} entering={FadeIn.duration(220)} style={{ flex: 1, backgroundColor: p.bg }}>
      {card ? (
        <StoryCard
          index={i} total={total} progress={progress} theme={storyTheme(card.habit.color, p.dark)}
          big={card.big} bigIcon={card.bigIcon} bigSize={card.bigIcon ? (card.bigIcon === 'flame' ? 72 : 88) : 128}
          line={card.line} pill={card.pill} mood={card.mood} prop={card.prop}
          onTap={() => setI(i + 1)} onClose={close}
        />
      ) : (
        <StoryCard
          index={i} total={total} progress={progress} theme={storyTheme('gold', p.dark)} final
          big={String(recap.kept)} bigSize={150} line={recap.kept === 1 ? 'habit kept this week.' : 'habits kept this week.'}
          mood="proud" prop="trophy" onTap={() => {}} onClose={close} onShare={share}
        />
      )}
    </Animated.View>
  );
}
