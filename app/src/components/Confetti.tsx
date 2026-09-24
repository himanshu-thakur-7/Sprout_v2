import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { GOLD, GREEN } from '@/theme/colors';
import { burstEase } from '@/theme/motion';

// Confetti bursts from the check in the habit colour, with a little green and gold.

type Burst = { id: number; x: number; y: number; color: string };
type Ctx = { burstFrom: (ref: RefObject<View | null>, color: string) => void };

const ConfettiContext = createContext<Ctx>({ burstFrom: () => {} });
export const useConfetti = () => useContext(ConfettiContext);

export function ConfettiLayer({ children }: { children: ReactNode }) {
  const root = useRef<View>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);

  const burstFrom = useCallback((ref: RefObject<View | null>, color: string) => {
    const target = ref.current, host = root.current;
    if (!target || !host) return;
    host.measureInWindow((hx, hy) => {
      target.measureInWindow((x, y, w, h) => {
        const b = { id: Date.now() + Math.random(), x: x - hx + w / 2, y: y - hy + h / 2, color };
        setBursts(bs => [...bs, b]);
        setTimeout(() => setBursts(bs => bs.filter(v => v.id !== b.id)), 1000);
      });
    });
  }, []);

  return (
    <ConfettiContext.Provider value={{ burstFrom }}>
      <View ref={root} style={{ flex: 1 }} collapsable={false}>
        {children}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 20 }]}>
          {bursts.map(b => <BurstView key={b.id} {...b} />)}
        </View>
      </View>
    </ConfettiContext.Provider>
  );
}

function BurstView({ x, y, color }: Burst) {
  const t = useSharedValue(0);
  useEffect(() => { t.value = withTiming(1, { duration: 800, easing: burstEase }); }, [t]);
  return (
    <View style={{ position: 'absolute', left: x, top: y }}>
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2 + (i % 3) * 0.2, dist = 40 + ((i * 37) % 34), sq = i % 3 === 0;
        return (
          <Piece key={i} t={t} dx={Math.cos(a) * dist} dy={Math.sin(a) * dist} r={(i * 47) % 360}
            w={sq ? 8 : 6} h={sq ? 8 : 11} radius={sq ? 4 : 2} color={[color, GREEN.primary, GOLD.base, color][i % 4]} />
        );
      })}
    </View>
  );
}

function Piece({ t, dx, dy, r, w, h, radius, color }: { t: SharedValue<number>; dx: number; dy: number; r: number; w: number; h: number; radius: number; color: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.7, 1], [1, 1, 0]),
    transform: [
      { translateX: dx * t.value }, { translateY: dy * t.value },
      { scale: 0.3 + 0.7 * t.value }, { rotate: `${r * t.value}deg` },
    ],
  }));
  return <Animated.View style={[{ position: 'absolute', left: -w / 2, top: -h / 2, width: w, height: h, borderRadius: radius, backgroundColor: color }, style]} />;
}

/** Static scattered confetti for the golden perfect-day wash (golden-angle spiral). */
export function Scatter({ n, cx, cy, sx, sy, colors, seed }: { n: number; cx: number; cy: number; sx: number; sy: number; colors: string[]; seed: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: n }, (_, i) => {
        const a = ((i * 137.5 + seed) * Math.PI) / 180, rr = 0.3 + (((i * 53 + seed) % 100) / 140), sq = i % 3 === 0;
        return (
          <View key={i} style={{
            position: 'absolute', left: cx + Math.cos(a) * sx * rr, top: cy + Math.sin(a) * sy * rr,
            width: 7, height: sq ? 7 : 12, borderRadius: sq ? 4 : 2, backgroundColor: colors[i % colors.length],
            transform: [{ rotate: `${(i * 47) % 180}deg` }],
          }} />
        );
      })}
    </View>
  );
}
