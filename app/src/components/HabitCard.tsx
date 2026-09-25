import { forwardRef, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { accentFor, GREEN, type AccentId } from '@/theme/colors';
import { springEase, springEaseFn } from '@/theme/motion';
import { usePalette } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Ledge } from './Ledge';
import { Ring } from './Ring';
import { Txt } from './Txt';

export type CardState = 'due' | 'progress' | 'done' | 'rest' | 'open';

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
  /** Never checked yet: grey flame and a "New" pill instead of a lit 0. */
  isNew?: boolean;
  /** Weekly habit logged today but the week isn't met yet: ring plus a check badge, not the full done style. */
  loggedToday?: boolean;
  pressed?: boolean;
  /** This card was just checked off: boop, pop and draw the tick. */
  celebrate?: boolean;
  /** Bump to wiggle (a full counter was tapped). */
  wiggle?: number;
  /** Tap on the check/streak zone. */
  onCheck?: () => void;
  /** Long-press the check: take one back (counters). */
  onCheckLongPress?: () => void;
  /** Tap on the icon/title zone: open details. */
  onOpen?: () => void;
};

/**
 * The habit card. 76pt tall, 24 radius, 4px accent ledge.
 * Left (icon + title) opens details; right (check + streak) logs. The check's
 * view is exposed via ref so confetti can burst from it.
 */
export const HabitCard = forwardRef<View, HabitCardProps>(function HabitCard(
  { title, sub, color, icon, state, kind, progress = 0, streak, unit, isNew, loggedToday, pressed, celebrate, wiggle = 0, onCheck, onCheckLongPress, onOpen },
  controlRef,
) {
  const p = usePalette();
  const a = accentFor(color, p);
  const rest = state === 'rest';
  const fullDone = state === 'done' && !loggedToday;
  const [down, setDown] = useState(false);

  // Card boop (1 → 1.03 → 1) when it lands; a sideways wiggle when a full counter is tapped.
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (celebrate && fullDone) scale.value = withSequence(withTiming(1.03, { duration: 110 }), withTiming(1, { duration: 220, easing: springEase }));
  }, [celebrate, fullDone, scale]);
  const firstWiggle = useRef(wiggle);
  useEffect(() => {
    if (wiggle === firstWiggle.current) return;
    shake.value = withSequence(withTiming(-6, { duration: 60 }), withTiming(6, { duration: 80 }), withTiming(-4, { duration: 70 }), withTiming(0, { duration: 70 }));
  }, [wiggle, shake]);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { translateX: shake.value }] }));

  const titleColor = rest ? p.secondary : p.ink;
  const bg = rest ? p.rest : fullDone ? a.tint : p.surface;
  const a11y = `${title}, ${sub}. ${isNew ? 'New habit' : `Streak ${streak} ${unit ? 'weeks' : 'days'}`}.`;

  const zone = (on: () => void) => ({ onPressIn: () => setDown(true), onPressOut: () => setDown(false), onPress: on });

  return (
    <Animated.View style={cardStyle}>
      <Ledge edge={a.edge} radius={24} flat={rest} pressed={pressed || down} duration={160}
        style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: bg, minHeight: 76,
          borderWidth: 1.5, borderStyle: rest ? 'dashed' : 'solid', borderColor: rest ? p.restLine : 'transparent',
        }}>
        <Pressable {...zone(() => onOpen?.())} accessibilityRole="button" accessibilityLabel={`${title} details`} accessibilityHint="Opens the calendar and stats"
          style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 16, paddingRight: 8 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: fullDone ? p.surface : a.tint, alignItems: 'center', justifyContent: 'center', opacity: rest ? 0.6 : 1 }}>
            <Icon n={icon} c={a.base} s={26} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Txt size={18} w={800} ls={-0.2} color={titleColor} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1 }}>{title}</Txt>
              <Icon n="chevR" c={p.tertiary} s={14} />
            </View>
            <Txt size={14} w={fullDone ? 700 : 400} color={fullDone ? a.ink : p.secondary} numberOfLines={1}>{sub}</Txt>
          </View>
        </Pressable>
        <Pressable {...zone(() => onCheck?.())} onLongPress={onCheckLongPress} disabled={rest}
          accessibilityRole="checkbox" accessibilityState={{ checked: state === 'done' }} accessibilityLabel={a11y}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingRight: 16, paddingLeft: 4 }}>
          <View ref={controlRef} collapsable={false} style={{ width: 44, height: 44 }}>
            {fullDone ? <DoneCheck key="done" animate={!!celebrate} />
              : rest ? null
                : kind === 'daily' ? <OpenCheck ring={p.softLedge} />
                  : (
                    <View>
                      <Ring size={44} stroke={5} progress={progress} color={a.base} track={a.tint} plus={loggedToday ? undefined : a.ink} />
                      {loggedToday ? <View style={{ position: 'absolute', left: 11, top: 11 }}><DoneCheck size={22} animate={!!celebrate} /></View> : null}
                    </View>
                  )}
          </View>
          <Streak streak={streak} unit={unit} isNew={isNew} base={a.base} ink={a.ink} muted={rest} lit={!!celebrate && state === 'done'} />
        </Pressable>
      </Ledge>
    </Animated.View>
  );
});

/** Not-done daily check: a neutral ring with a faint tick ghost, so it reads as "tap me", not "disabled". */
function OpenCheck({ ring }: { ring: string }) {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Circle cx={22} cy={22} r={19.5} fill="none" stroke={ring} strokeWidth={3} />
      <Path d="M15 22.5l5 5 9-9.5" fill="none" stroke={ring} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
    </Svg>
  );
}

/** Flame + number. The number rolls up when it changes and a "+1" chip floats off the flame. */
function Streak({ streak, unit, isNew, base, ink, muted, lit }: { streak: number; unit?: string; isNew?: boolean; base: string; ink: string; muted: boolean; lit: boolean }) {
  const p = usePalette();
  const roll = useSharedValue(0);
  const chip = useSharedValue(0);
  const flame = useSharedValue(1);
  const prev = useRef(streak);
  useEffect(() => {
    if (streak === prev.current) return;
    const up = streak > prev.current;
    prev.current = streak;
    roll.value = up ? 1 : -1;
    roll.value = withTiming(0, { duration: 420, easing: springEase });
    if (up) {
      chip.value = 0;
      chip.value = withDelay(120, withTiming(1, { duration: 700 }));
    }
  }, [streak, roll, chip]);
  useEffect(() => {
    if (lit) flame.value = withDelay(200, withSequence(withTiming(1.35, { duration: 180 }), withTiming(1, { duration: 360, easing: springEase })));
  }, [lit, flame]);
  const numStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.abs(roll.value) * 0.8, transform: [{ translateY: roll.value * 18 }] }));
  const chipStyle = useAnimatedStyle(() => ({
    opacity: chip.value === 0 ? 0 : chip.value < 0.2 ? chip.value * 5 : 1 - (chip.value - 0.2) / 0.8,
    transform: [{ translateY: -16 * chip.value }],
  }));
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: flame.value }] }));

  if (isNew) {
    return (
      <View style={{ minWidth: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
        <View style={{ opacity: 0.45 }}><Icon n="flame" c={p.tertiary} c2={p.surface} s={20} /></View>
        <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: p.rest }}>
          <Txt size={12} w={800} color={p.hint}>New</Txt>
        </View>
      </View>
    );
  }
  return (
    <View style={{ minWidth: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, opacity: muted ? 0.6 : 1 }}>
      <Animated.View style={flameStyle}><Icon n="flame" c={base} s={22} /></Animated.View>
      <View style={{ overflow: 'hidden', paddingVertical: 2 }}>
        <Animated.View style={numStyle}>
          <Txt size={24} w={900} ls={-0.5} color={ink} style={{ lineHeight: 26 }}>{streak}</Txt>
        </Animated.View>
      </View>
      {unit ? <Txt size={12} w={800} color={ink} style={{ alignSelf: 'flex-end', marginBottom: 3, marginLeft: 1 }}>{unit}</Txt> : null}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', right: 0, top: -14, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, backgroundColor: base }, chipStyle]}>
        <Txt size={11} w={900} color="#1F2A24">+1</Txt>
      </Animated.View>
    </View>
  );
}

const APath = Animated.createAnimatedComponent(Path);

/** The one done style, everywhere: a green circle with a white tick. Pops and draws in when it lands. */
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
