import { useEffect } from 'react';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { springEase } from '@/theme/motion';

const ACircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size: number;
  stroke: number;
  progress: number;
  color: string;
  track: string;
  /** Draw a "+" in the middle (counter / weekly controls). */
  plus?: string;
};

/** Progress ring: track in tint, arc in base, rounded cap, starts at 12 o'clock. Animates with the spring ease. */
export function Ring({ size, stroke, progress, color, track, plus }: Props) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const pv = useSharedValue(clamp(progress));
  useEffect(() => { pv.value = withTiming(clamp(progress), { duration: 500, easing: springEase }); }, [progress, pv]);
  const arc = useAnimatedProps(() => ({
    strokeDasharray: [Math.max(0.001, C * pv.value), C],
    opacity: pv.value > 0.001 ? 1 : 0,
  }));
  const c = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <ACircle animatedProps={arc} cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`} />
      {plus ? <Path d={`M${c} ${c - 5.5}v11M${c - 5.5} ${c}h11`} stroke={plus} strokeWidth={2.8} strokeLinecap="round" /> : null}
    </Svg>
  );
}

const clamp = (v: number) => Math.max(0, Math.min(1, v || 0));
