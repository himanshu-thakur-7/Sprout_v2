import { forwardRef, useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { Keyframe, LayoutAnimationConfig, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { accentFor, GREEN, type AccentId } from '@/theme/colors';
import { springEaseFn } from '@/theme/motion';
import { usePalette } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Ledge } from './Ledge';
import { Ring } from './Ring';
import { Txt } from './Txt';

export type CardState = 'due' | 'progress' | 'done' | 'rest';

export type HabitCardProps = {
  title: string;
  sub: string;
  color: AccentId;
  icon: IconName;
  state: CardState;
  /** Counters and weekly habits show a ring with a "+". */
  kind: 'daily' | 'count' | 'weekly';
  progress?: number;
  streak: number;
  /** "wk" for weekly streaks. */
  unit?: string;
  pressed?: boolean;
  /** This card was just checked off: pop and draw the tick. */
  celebrate?: boolean;
  onTap?: () => void;
  onLongPress?: () => void;
};

const APath = Animated.createAnimatedComponent(Path);

const flip = new Keyframe({
  0: { transform: [{ translateY: 14 }], opacity: 0 },
  60: { transform: [{ translateY: -3 }], opacity: 1, easing: springEaseFn },
  100: { transform: [{ translateY: 0 }] },
}).duration(460);

/**
 * The habit card. 76pt tall, 24 radius, 4px accent ledge. Tap to log; the
 * control's view is exposed via ref so confetti can burst from the check.
 */
export const HabitCard = forwardRef<View, HabitCardProps>(function HabitCard(
  { title, sub, color, icon, state, kind, progress = 0, streak, unit, pressed, celebrate, onTap, onLongPress }, controlRef,
) {
  const p = usePalette();
  const a = accentFor(color, p);
  const done = state === 'done', rest = state === 'rest';

  // Flame flares to 1.3× when the habit lands.
  const flame = useSharedValue(1);
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) flame.value = withSequence(withTiming(1.3, { duration: 180 }), withTiming(1, { duration: 360, easing: springEaseFn }));
    wasDone.current = done;
  }, [done, flame]);
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: flame.value }] }));

  const titleColor = done || rest ? p.secondary : p.ink;
  const a11y = `${title}. ${sub}. Streak ${streak}${unit ? ' weeks' : ' days'}.${done ? ' Done.' : ''}`;

  return (
    <Ledge
      edge={a.edge} radius={24} flat={rest} pressed={pressed} duration={160}
      onPress={rest ? undefined : onTap} onLongPress={onLongPress}
      accessibilityLabel={a11y} accessibilityRole="checkbox" accessibilityState={{ checked: done }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12.5, paddingHorizontal: 16,
        backgroundColor: rest ? p.rest : p.surface,
        borderWidth: 1.5, borderStyle: rest ? 'dashed' : 'solid', borderColor: rest ? p.restLine : 'transparent',
      }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: a.tint, alignItems: 'center', justifyContent: 'center', opacity: rest ? 0.6 : 1 }}>
        <Icon n={icon} c={a.base} s={26} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Txt size={18} w={800} ls={-0.2} color={titleColor} numberOfLines={1} strike={done ? p.tertiary : undefined}>{title}</Txt>
        <Txt size={14} w={400} color={p.secondary} numberOfLines={1}>{sub}</Txt>
      </View>
      <View ref={controlRef} collapsable={false}>
        {done ? <DoneCheck key="done" animate={!!celebrate} />
          : rest ? null
            : <Ring size={44} stroke={5} progress={progress} color={a.base} track={a.tint} plus={kind === 'daily' ? undefined : a.ink} />}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, minWidth: 54, opacity: rest ? 0.6 : 1 }}>
        <Animated.View style={flameStyle}><Icon n="flame" c={a.base} s={22} /></Animated.View>
        <View style={{ overflow: 'hidden' }}>
          <LayoutAnimationConfig skipEntering>
            <Animated.View key={streak} entering={flip}>
              <Txt size={20} w={900} ls={-0.3} color={a.ink} style={{ lineHeight: 22 }}>{streak}</Txt>
            </Animated.View>
          </LayoutAnimationConfig>
        </View>
        {unit ? <Txt size={11} w={800} color={a.ink} style={{ alignSelf: 'flex-end', marginBottom: 2, marginLeft: 1 }}>{unit}</Txt> : null}
      </View>
    </Ledge>
  );
});

/** The one done style, everywhere: 44pt green circle, white tick. Pops and draws in when it lands. */
export function DoneCheck({ size = 44, animate = false }: { size?: number; animate?: boolean }) {
  const scale = useSharedValue(animate ? 0.6 : 1);
  const draw = useSharedValue(animate ? 22 : 0);
  useEffect(() => {
    if (!animate) return;
    scale.value = withSequence(withTiming(1.14, { duration: 250 }), withTiming(1, { duration: 170, easing: springEaseFn }));
    draw.value = withDelay(80, withTiming(0, { duration: 320 }));
  }, [animate, scale, draw]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const tick = useAnimatedProps(() => ({ strokeDashoffset: draw.value }));
  const icon = Math.round(size * 0.59);
  return (
    <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: GREEN.primary, alignItems: 'center', justifyContent: 'center' }, pop]}>
      <Svg viewBox="0 0 24 24" width={icon} height={icon}>
        <APath animatedProps={tick} d="M6.5 12.5l3.8 3.7 7.2-7.7" fill="none" stroke="#fff" strokeWidth={3.2}
          strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[22, 22]} />
      </Svg>
    </Animated.View>
  );
}
