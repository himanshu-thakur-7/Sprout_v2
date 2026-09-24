import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Pip } from '@/components/Pip';
import { Handle, Sheet } from '@/components/Sheet';
import { Txt } from '@/components/Txt';
import { accentFor, ACCENTS, GOLD, mix } from '@/theme/colors';
import { springEaseFn } from '@/theme/motion';
import { usePalette } from '@/theme/ThemeProvider';
import { currentStreak, perfectDayCount, shieldInfo, type Slip } from '@/state/logic';
import { useStore } from '@/state/store';
import { successHaptic } from '@/utils/haptics';

const SHIELD = ACCENTS.lavender;
const SCRIM = 'rgba(24,30,26,0.5)';

/**
 * 13 Streak slipped → 14 Shield used. Honest (the flame is cracked and the
 * number struck, not hidden) and kind (no red, no scolding, just a way back).
 */
export function SlipSheet({ slip, onLater }: { slip: Slip | null; onLater: (key: string) => void }) {
  const p = usePalette();
  const { state, today, spendShield, dismissSlip } = useStore();
  const [saved, setSaved] = useState<Slip | null>(null);
  const shown = saved ?? slip;
  const perfect = perfectDayCount(state, today);
  const { ready, nextIn } = shieldInfo(state, perfect);

  if (!shown) return null;
  const a = accentFor(shown.habit.color, p);
  const unit = (n: number) => `${n} ${shown.unit === 'weeks' ? (n === 1 ? 'week' : 'weeks') : n === 1 ? 'day' : 'days'}`;

  const rescue = () => {
    successHaptic();
    setSaved(shown);
    spendShield(shown.key);
  };

  if (saved) {
    return (
      <Sheet visible onClose={() => setSaved(null)} scrim={SCRIM}
        above={(
          <View style={{ height: 156, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={{ position: 'absolute', left: 84, top: 24 }}><Icon n="sparkle" c={GOLD.glow} s={20} /></View>
            <View style={{ position: 'absolute', right: 90, top: 54 }}><Icon n="sparkle" c={GOLD.glow} s={14} /></View>
            <Animated.View entering={ZoomIn.duration(420).delay(360).easing(springEaseFn)} style={{ marginBottom: -40 }}>
              <Pip mood="relieved" size={130} shadow={false} />
            </Animated.View>
          </View>
        )}
        style={{ paddingTop: 10, paddingHorizontal: 20, alignItems: 'center', minHeight: 430 }}>
        <Handle />
        <SavedFlame base={a.base} ink={a.ink} n={saved.lost} />
        <Txt size={30} w={900} ls={-0.7} style={{ marginTop: 16 }}>Streak saved</Txt>
        <Txt size={16} w={400} color={p.secondary} align="center" lh={1.45} style={{ marginTop: 8, maxWidth: 290 }}>
          {currentStreak(state, saved.habit, today) > saved.lost
            ? `${saved.habit.name} keeps its ${unit(saved.lost)}, and ${saved.unit === 'weeks' ? 'this week' : 'today'} makes it ${saved.lost + 1}.`
            : `${saved.habit.name} keeps its ${unit(saved.lost)}. ${saved.unit === 'weeks' ? 'This week’s a fresh one' : 'Today’s a fresh one'}, so let’s make it ${saved.lost + 1}.`}
        </Txt>
        <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingLeft: 10, paddingRight: 14, borderRadius: 16, backgroundColor: p.rest }}>
          <Icon n="shield" c={p.tertiary} s={16} c2={p.rest} />
          <Txt size={13} w={800} color={p.secondary}>{`${ready} shield${ready === 1 ? '' : 's'} · next one in ${nextIn} day${nextIn === 1 ? '' : 's'}`}</Txt>
        </View>
        <View style={{ flex: 1, minHeight: 28 }} />
        <Button label={saved.unit === 'weeks' ? 'Back to this week' : 'Back to today'} onPress={() => setSaved(null)} style={{ alignSelf: 'stretch', marginBottom: 20 }} />
      </Sheet>
    );
  }

  const s = shown;
  return (
    <Sheet visible onClose={() => onLater(s.key)} scrim={SCRIM} style={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' }}>
      <Handle />
      <View style={{ marginTop: 24, width: 120, height: 104, alignItems: 'center' }}>
        <Icon n="flame" c={mix(a.base, '#FFFFFF', 0.6)} c2="#FFFFFF" s={100} />
        <Svg width={100} height={100} viewBox="0 0 24 24" style={{ position: 'absolute', left: 10, top: 0 }}>
          <Path d="M12.6 6.2L10.8 10.6L13.2 12.4L11.2 17.6" fill="none" stroke={ACCENTS[s.habit.color].edge} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Txt size={28} w={900} color={ACCENTS[s.habit.color].edge} strike={ACCENTS[s.habit.color].edge} style={{ position: 'absolute', right: -8, bottom: 6 }}>{s.lost}</Txt>
      </View>
      <Txt size={28} w={900} ls={-0.6} lh={1.1} align="center" style={{ marginTop: 16, maxWidth: 300 }} accessibilityRole="header">
        {`Your ${s.habit.name.toLowerCase()} streak slipped`}
      </Txt>
      <Txt size={16} w={400} color={p.secondary} style={{ marginTop: 8 }}>{`${unit(s.lost)} is worth saving.`}</Txt>
      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingLeft: 10, paddingRight: 14, borderRadius: 16, backgroundColor: p.dark ? accentFor('lavender', p).tint : SHIELD.tint }}>
        <Icon n="shield" c={SHIELD.base} s={18} c2={p.dark ? p.surface : SHIELD.tint} />
        <Txt size={14} w={800} color={p.dark ? SHIELD.base : '#6A4FD0'}>
          {ready > 0 ? `${ready} shield${ready === 1 ? '' : 's'} left` : `No shields yet · next in ${nextIn} day${nextIn === 1 ? '' : 's'}`}
        </Txt>
      </View>
      {ready > 0 ? <Button label="Use a shield" icon="shield" onPress={rescue} style={{ marginTop: 22, alignSelf: 'stretch' }} /> : null}
      <Button label="Start fresh today" variant={ready > 0 ? 'secondary' : 'primary'} onPress={() => dismissSlip(s.key)} style={{ marginTop: ready > 0 ? 14 : 22, alignSelf: 'stretch' }} />
    </Sheet>
  );
}

/** Shield drops onto the flame (360 ms spring), then the flame re-lights with a glow pulse. */
function SavedFlame({ base, ink, n }: { base: string; ink: string; n: number }) {
  const p = usePalette();
  const glow = useSharedValue(0.4);
  useEffect(() => {
    glow.value = withDelay(360, withSequence(withTiming(1, { duration: 260 }), withTiming(0.75, { duration: 400 })));
  }, [glow]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.8 + glow.value * 0.2 }] }));
  return (
    <View style={{ marginTop: 22, width: 150, height: 118, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: 150, height: 150 }, glowStyle]}>
        <Svg width={150} height={150}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={base} stopOpacity={0.45} />
              <Stop offset="0.65" stopColor={base} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={150} height={150} fill="url(#glow)" />
        </Svg>
      </Animated.View>
      <Icon n="flame" c={base} c2="#FFFFFF" s={100} />
      <Animated.View entering={ZoomIn.duration(360).easing(springEaseFn)} style={{ position: 'absolute', right: 14, bottom: -2, paddingBottom: 3 }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, borderRadius: 23, backgroundColor: SHIELD.edge }} />
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon n="shield" c={SHIELD.edge} c2={p.surface} s={30} />
        </View>
      </Animated.View>
      <Animated.View entering={FadeIn.duration(300)} style={{ position: 'absolute', left: 4, bottom: 4 }}>
        <Txt size={30} w={900} color={ink}>{n}</Txt>
      </Animated.View>
    </View>
  );
}
