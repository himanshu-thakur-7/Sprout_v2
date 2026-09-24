import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gradient } from '@/components/Backdrop';
import { Scatter } from '@/components/Confetti';
import { Icon, type IconName } from '@/components/Icon';
import { Ledge } from '@/components/Ledge';
import { Pip, type PipMood, type PipProp } from '@/components/Pip';
import { Txt } from '@/components/Txt';
import { ACCENTS, GREEN, mix, type AccentId } from '@/theme/colors';

// 17–21 Weekly recap story card: one huge number, one sentence, one Pip pose.
// The close button always sits below the progress bar.

export type StoryTheme = {
  stops: [number, string][];
  bg2: string;
  glow: string;
  accent: string;
  numC: string;
  lineC: string;
  tapC: string;
  track: string;
  closeBg: string;
  pillBg: string;
  pillC: string;
  sparkle: string;
};

/** Celebration grounds from the design system; other accents derive the same way. */
const GROUNDS: Partial<Record<AccentId, { stops: [number, string][]; bg2: string; numC: string }>> = {
  sunflower: { stops: [[0, '#FFF6D9'], [1, '#FFF1C4']], bg2: '#FFF3CC', numC: '#D39A0C' },
  tangerine: { stops: [[0, '#FFF0E2'], [1, '#FFE4CC']], bg2: '#FFE9D6', numC: '#E0822A' },
  lavender: { stops: [[0, '#F3EFFE'], [1, '#E9E1FD']], bg2: '#EEE8FE', numC: '#8B6FE0' },
  teal: { stops: [[0, '#E6F8F4'], [1, '#D4F2EC']], bg2: '#DDF6F3', numC: '#1A978A' },
};

export function storyTheme(color: AccentId | 'gold', dark: boolean): StoryTheme {
  const base = { lineC: '#2F6B45', tapC: '#8C887F', track: 'rgba(31,42,36,0.10)', closeBg: 'rgba(255,255,255,0.55)', pillBg: 'rgba(255,255,255,0.7)' };
  let t: StoryTheme;
  if (color === 'gold') {
    t = { ...base, stops: [[0, '#FFD84D'], [0.55, '#FFE58A'], [1, '#FFF0B8']], bg2: '#FFE58A', glow: 'rgba(255,255,255,0.35)', accent: '#FFFFFF', numC: '#9A6600', pillC: '#9A6600', sparkle: '#FFFFFF' };
  } else {
    const a = ACCENTS[color];
    const g = GROUNDS[color] ?? { stops: [[0, mix(a.tint, '#FFFFFF', 0.6)], [1, a.tint]] as [number, string][], bg2: a.tint, numC: a.edge };
    t = { ...base, ...g, glow: 'rgba(255,255,255,0.45)', accent: a.base, pillC: a.ink, sparkle: a.base };
  }
  if (!dark) return t;
  const hue = color === 'gold' ? '#FFC83D' : ACCENTS[color].base;
  const ground = mix(hue, '#131915', 0.1);
  return {
    ...t, stops: [[0, ground], [1, ground]], bg2: ground, glow: hexA(hue, 0.06), accent: color === 'gold' ? '#FFC83D' : t.accent,
    numC: hue, lineC: '#F2EEE6', tapC: '#A3A89E', track: 'rgba(255,255,255,0.14)', closeBg: 'rgba(255,255,255,0.08)',
    pillBg: 'rgba(255,255,255,0.08)', pillC: hue, sparkle: hue,
  };
}

const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

type Props = {
  index: number;
  total: number;
  /** 0–1 fill of the current segment. */
  progress: SharedValue<number>;
  theme: StoryTheme;
  big: string;
  bigIcon?: IconName;
  bigSize?: number;
  line: string;
  pill?: string;
  mood: PipMood;
  prop: PipProp;
  final?: boolean;
  onTap: () => void;
  onClose: () => void;
  onShare?: () => void;
};

export function StoryCard({ index, total, progress, theme: t, big, bigIcon, bigSize = 128, line, pill, mood, prop, final, onTap, onClose, onShare }: Props) {
  const insets = useSafeAreaInsets();
  const segFill = useAnimatedStyle(() => ({ width: `${Math.round(progress.value * 100)}%` }));

  // Pip's pose loop: a little hop every 1.6 s.
  const hop = useSharedValue(0);
  useEffect(() => {
    hop.value = withRepeat(withSequence(
      withTiming(-10, { duration: 260, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 320, easing: Easing.bounce }),
      withTiming(0, { duration: 1000 }),
    ), -1);
    return () => cancelAnimation(hop);
  }, [hop, index]);
  const hopStyle = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value }] }));

  return (
    <Pressable onPress={final ? undefined : onTap} style={{ flex: 1, overflow: 'hidden' }} accessibilityLabel={`${big} ${line}. Tap to continue.`}>
      <Gradient id={`story${index}`} stops={t.stops} />
      <View style={{ position: 'absolute', left: -60, top: 120, width: 220, height: 220, borderRadius: 110, backgroundColor: t.glow }} />
      <View style={{ position: 'absolute', right: -70, top: 520, width: 260, height: 260, borderRadius: 130, backgroundColor: t.glow }} />
      {final ? <Scatter n={30} cx={196} cy={470} sx={180} sy={220} seed={0} colors={['#4DA8F0', '#FF9F43', '#A78BFA', '#FF7A6B', '#2EC4B6', '#58C27D']} /> : null}

      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', gap: 6, paddingTop: 6, paddingHorizontal: 20 }}>
          {Array.from({ length: total }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: t.track, overflow: 'hidden' }}>
              {i < index ? <View style={[StyleSheet.absoluteFill, { backgroundColor: t.accent, borderRadius: 3 }]} /> : null}
              {i === index ? <Animated.View style={[{ height: '100%', backgroundColor: t.accent, borderRadius: 3 }, segFill]} /> : null}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 12, paddingHorizontal: 16 }}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close recap"
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.closeBg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="close" c={t.lineC} s={20} />
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', paddingTop: 14, paddingHorizontal: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CountUp value={big} size={bigSize} color={t.numC} key={`${index}-${big}`} />
            {bigIcon ? <Icon n={bigIcon} c={t.accent} c2={t.bg2} s={bigIcon === 'flame' ? 66 : 72} /> : null}
          </View>
          <Txt size={30} w={900} ls={-0.6} lh={1.12} color={t.lineC} align="center" style={{ marginTop: 14, maxWidth: 320 }}>{line}</Txt>
          {pill ? (
            <View style={{ marginTop: 16, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 22, backgroundColor: t.pillBg }}>
              <Txt size={16} w={800} color={t.pillC}>{pill}</Txt>
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {[[70, 40, 22], [300, 70, 16], [52, 200, 14], [318, 210, 20]].map(([x, y, s]) => (
            <View key={x} style={{ position: 'absolute', left: x, top: y }}><Icon n="sparkle" c={t.sparkle} s={s} /></View>
          ))}
          <Animated.View style={hopStyle}><Pip mood={mood} prop={prop} size={200} /></Animated.View>
        </View>

        {final ? (
          <View style={{ alignItems: 'center', gap: 18, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 20) + 20 }}>
            <Txt size={24} w={900} color={t.numC}>See you Monday.</Txt>
            <View style={{ flexDirection: 'row', gap: 12, alignSelf: 'stretch' }}>
              <Ledge edge="#E3C766" radius={28} onPress={onShare} outerStyle={{ flex: 1 }} accessibilityLabel="Share"
                style={{ height: 56, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Icon n="share" c="#1F2A24" s={20} />
                <Txt size={18} w={900} color="#1F2A24">Share</Txt>
              </Ledge>
              <Ledge edge={GREEN.edge} radius={28} onPress={onClose} outerStyle={{ flex: 1 }} accessibilityLabel="Done"
                style={{ height: 56, backgroundColor: GREEN.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Txt size={18} w={900} color="#FFFFFF">Done</Txt>
              </Ledge>
            </View>
          </View>
        ) : (
          <Txt size={15} w={700} color={t.tapC} align="center" style={{ paddingBottom: Math.max(insets.bottom, 10) + 34 }}>Tap to continue</Txt>
        )}
      </View>
    </Pressable>
  );
}

/** The number counts up from 0 over 600 ms (spring ease). Non-numeric values ("Saved") pop in as-is. */
function CountUp({ value, size, color }: { value: string; size: number; color: string }) {
  const m = value.match(/^(\d+)(.*)$/);
  const target = m ? Number(m[1]) : 0;
  const [n, setN] = useState(m ? 0 : target);
  useEffect(() => {
    if (!m || target === 0) return;
    let raf = 0;
    const start = Date.now();
    const ease = Easing.bezierFn(0.34, 1.56, 0.64, 1);
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / 600);
      setN(Math.max(0, Math.round(target * Math.min(ease(p), 1.08))));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setN(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  const text = m ? `${n}${m[2]}` : value;
  return (
    <Txt size={size} w={900} ls={-4} color={color} numberOfLines={1} adjustsFontSizeToFit style={{ lineHeight: size * 1.05 }}>
      {text}
    </Txt>
  );
}
