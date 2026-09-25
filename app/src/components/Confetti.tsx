import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { GOLD, GREEN } from '@/theme/colors';

// Confetti bursts from the check in the habit colour, with a little green and gold.

type Burst = { id: number; x: number; y: number; color: string };
type Ctx = { burstFrom: (ref: RefObject<View | null>, color: string) => void; burstAt: (x: number, y: number, color: string) => void };

const ConfettiContext = createContext<Ctx>({ burstFrom: () => {}, burstAt: () => {} });
export const useConfetti = () => useContext(ConfettiContext);

export function ConfettiLayer({ children }: { children: ReactNode }) {
  const root = useRef<View>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);

  const burstAt = useCallback((x: number, y: number, color: string) => {
    const b = { id: Date.now() + Math.random(), x, y, color };
    setBursts(bs => [...bs, b]);
    setTimeout(() => setBursts(bs => bs.filter(v => v.id !== b.id)), 1300);
  }, []);

  const burstFrom = useCallback((ref: RefObject<View | null>, color: string) => {
    const target = ref.current, host = root.current;
    if (!target || !host) return;
    host.measureInWindow((hx, hy) => {
      target.measureInWindow((x, y, w, h) => {
        const b = { id: Date.now() + Math.random(), x: x - hx + w / 2, y: y - hy + h / 2, color };
        setBursts(bs => [...bs, b]);
        setTimeout(() => setBursts(bs => bs.filter(v => v.id !== b.id)), 1300);
      });
    });
  }, []);

  return (
    <ConfettiContext.Provider value={{ burstFrom, burstAt }}>
      <View ref={root} style={{ flex: 1 }} collapsable={false}>
        {children}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 20 }]}>
          {bursts.map(b => <BurstView key={b.id} {...b} />)}
        </View>
      </View>
    </ConfettiContext.Provider>
  );
}

const PIECES = 28;
const DURATION = 1100;
const GRAVITY = 900; // px/s²

/** 28 pieces fire from the check with an upward bias, arc under gravity, spin, and fade in the last 30%. */
function BurstView({ x, y, color }: Burst) {
  const t = useSharedValue(0);
  useEffect(() => { t.value = withTiming(1, { duration: DURATION, easing: Easing.linear }); }, [t]);
  const tint = color + '66';
  return (
    <View style={{ position: 'absolute', left: x, top: y }}>
      {Array.from({ length: PIECES }, (_, i) => {
        // Deterministic spread: golden-angle directions, biased upward.
        const a = -Math.PI / 2 + (((i * 137.5) % 360) - 180) * (Math.PI / 180) * 0.85;
        const speed = 170 + ((i * 53) % 130);
        const shape = i % 3;
        return (
          <Piece key={i} t={t} vx={Math.cos(a) * speed} vy={Math.sin(a) * speed} spin={180 + ((i * 71) % 360)}
            w={shape === 1 ? 8 : 6} h={shape === 1 ? 8 : shape === 2 ? 6 : 11} radius={shape === 1 ? 4 : 2}
            color={[color, GREEN.primary, GOLD.base, tint][i % 4]} />
        );
      })}
    </View>
  );
}

function Piece({ t, vx, vy, spin, w, h, radius, color }: { t: SharedValue<number>; vx: number; vy: number; spin: number; w: number; h: number; radius: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const s = (t.value * DURATION) / 1000;
    return {
      opacity: interpolate(t.value, [0, 0.7, 1], [1, 1, 0]),
      transform: [
        { translateX: vx * s }, { translateY: vy * s + 0.5 * GRAVITY * s * s },
        { scale: interpolate(t.value, [0, 0.12, 1], [0.4, 1, 0.9]) }, { rotate: `${spin * t.value}deg` },
      ],
    };
  });
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
