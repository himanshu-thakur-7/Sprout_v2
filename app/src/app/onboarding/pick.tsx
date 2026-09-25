import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Ledge } from '@/components/Ledge';
import { Pip } from '@/components/Pip';
import { Txt } from '@/components/Txt';
import { OnboardingHeader } from '@/screens/onboarding/Header';
import { useDraft } from '@/screens/onboarding/draft';
import { accentFor, GREEN, PIP } from '@/theme/colors';
import { springEase, springEaseFn } from '@/theme/motion';
import { usePalette } from '@/theme/ThemeProvider';
import { TEMPLATES, type Template } from '@/state/templates';
import { tapHaptic } from '@/utils/haptics';

const PANEL = 136;

/** 02 Pick habits */
export default function Pick() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { draft, setDraft } = useDraft();
  const n = Object.values(draft.picked).filter(Boolean).length + (draft.custom ? 1 : 0);
  const label = n === 0 ? 'Pick at least one' : n > 4 ? `${n} picked · maybe start with fewer?` : `${n} picked`;
  const panelH = PANEL + Math.max(insets.bottom - 20, 0);
  const { width } = useWindowDimensions();
  // A fixed 3-column grid: every tile the same width, 12pt gutters.
  const tileW = Math.floor((width - 40 - 24) / 3);

  const toggle = (id: string) => { tapHaptic(); setDraft(d => ({ ...d, picked: { ...d.picked, [id]: !d.picked[id] } })); };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: insets.top }}>
      <OnboardingHeader step={1} />
      <ScrollView contentContainerStyle={{ paddingBottom: panelH + 80 }}>
        <Txt size={32} w={900} ls={-0.8} style={{ paddingTop: 18, paddingHorizontal: 20 }} accessibilityRole="header">Pick a few to start</Txt>
        <Txt size={16} w={400} color={p.secondary} style={{ paddingTop: 4, paddingHorizontal: 20 }}>3 is plenty.</Txt>
        <View style={{ paddingTop: 22, paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, columnGap: 12 }}>
          {TEMPLATES.map(t => <Tile key={t.id} t={t} w={tileW} on={!!draft.picked[t.id]} onPress={() => toggle(t.id)} />)}
          <Ledge edge={draft.custom ? p.softLedge : 'transparent'} radius={22} outerStyle={{ width: tileW }} onPress={() => { tapHaptic(); setDraft(d => ({ ...d, custom: !d.custom })); }}
            accessibilityRole="checkbox" accessibilityState={{ checked: draft.custom }} accessibilityLabel="Custom habit"
            style={{ height: 104, borderRadius: 22, borderWidth: 2.5, borderStyle: 'dashed', borderColor: draft.custom ? GREEN.primary : p.dashed, backgroundColor: draft.custom ? p.surface : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon n={draft.custom ? 'check' : 'plus'} c={draft.custom ? GREEN.primary : p.hint} s={28} />
            <Txt size={15} w={800} color={p.secondary}>Custom</Txt>
          </Ledge>
        </View>
      </ScrollView>

      {/* Pip peeks over the bottom panel, hands on its edge. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: panelH - 34, alignItems: 'center' }}>
        <Pip mood="expectant" size={100} shadow={false} />
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: panelH, backgroundColor: p.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 1.5, borderColor: p.line, paddingTop: 28, paddingHorizontal: 20, gap: 10 }}>
        <Button label="Continue" disabled={n === 0} onPress={() => router.push('/onboarding/rhythm')} />
        <Txt size={13} w={700} color={p.label} align="center">{label}</Txt>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: panelH - 8, flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
        <View style={{ width: 22, height: 16, borderRadius: 11, backgroundColor: PIP.arm }} />
        <View style={{ width: 22, height: 16, borderRadius: 11, backgroundColor: PIP.arm }} />
      </View>
    </View>
  );
}

/** Unpicked tiles are plain white on a neutral ledge with a quiet icon; picked tiles take the habit's tint, its ledge and a border, and pop 1.06×. */
function Tile({ t, on, w, onPress }: { t: Template; on: boolean; w: number; onPress: () => void }) {
  const p = usePalette();
  const a = accentFor(t.color, p);
  const scale = useSharedValue(1);
  const first = useSharedValue(true);
  useEffect(() => {
    if (first.value) { first.value = false; return; }
    if (on) scale.value = withSequence(withTiming(1.06, { duration: 140 }), withTiming(1, { duration: 200, easing: springEase }));
  }, [on, scale, first]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[{ width: w }, pop]}>
      <Ledge edge={on ? a.edge : p.softLedge} radius={22} onPress={onPress} accessibilityLabel={t.label} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
        style={{ height: 104, backgroundColor: on ? a.tint : p.surface, borderWidth: 3, borderColor: on ? a.base : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <View style={{ opacity: on ? 1 : 0.6 }}><Icon n={t.icon} c={a.base} s={36} /></View>
        <Txt size={15} w={800} color={on ? p.ink : p.secondary}>{t.label}</Txt>
        {on ? (
          <Animated.View entering={ZoomIn.duration(220).easing(springEaseFn)} style={{ position: 'absolute', top: 5, right: 5, paddingBottom: 2 }}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 2, bottom: 0, borderRadius: 12, backgroundColor: a.edge }} />
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Icon n="check" c={GREEN.button} s={16} />
            </View>
          </Animated.View>
        ) : null}
      </Ledge>
    </Animated.View>
  );
}
