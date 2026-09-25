import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Pip } from '@/components/Pip';
import { Handle, Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { Txt } from '@/components/Txt';
import { accentFor, ACCENTS, GOLD, mix } from '@/theme/colors';
import { springEaseFn } from '@/theme/motion';
import { usePalette } from '@/theme/ThemeProvider';
import { addDays, weekdayName } from '@/state/dates';
import { currentStreak, perfectDayCount, shieldInfo, target, type Slip } from '@/state/logic';
import { useStore } from '@/state/store';
import { TEMPLATES } from '@/state/templates';
import type { Habit } from '@/state/types';
import { successHaptic } from '@/utils/haptics';

const SHIELD = ACCENTS.lavender;
const SCRIM = 'rgba(24,30,26,0.5)';

/**
 * 13 Streak slipped → 14 Shield used. Honest (the flame is cracked and the
 * number struck, not hidden) and kind (no red, no scolding, just a way back).
 * Pip peeks over the sheet, sad with you. Several slips share one sheet.
 */
export function SlipSheet({ slips, onLater }: { slips: Slip[]; onLater: (keys: string[]) => void }) {
  const p = usePalette();
  const toast = useToast();
  const { state, today, spendShield, dismissSlip, setCount } = useStore();
  const [saved, setSaved] = useState<Slip | null>(null);
  const [picked, setPicked] = useState<string[] | null>(null);
  const shown = saved ?? slips[0] ?? null;
  const perfect = perfectDayCount(state, today);
  const { ready, nextIn } = shieldInfo(state, perfect);

  if (!shown) return null;
  const a = accentFor(shown.habit.color, p);
  const unit = (n: number) => `${n} ${shown.unit === 'weeks' ? (n === 1 ? 'week' : 'weeks') : n === 1 ? 'day' : 'days'}`;
  const shieldLine = ready > 0 ? `${ready} shield${ready === 1 ? '' : 's'} left`
    : `No shields ${state.shielded.length > 0 ? 'left' : 'yet'} · next in ${nextIn} day${nextIn === 1 ? '' : 's'}`;

  const rescue = () => {
    successHaptic();
    setSaved(shown);
    spendShield(shown.key);
  };
  // Forgot to tap? Log the missed day instead. Daily habits only: a missed week isn't one tap.
  const didIt = (sl: Slip) => {
    setCount(sl.habit.id, sl.period, target(sl.habit));
    successHaptic();
    toast.show({ text: `Logged. ${sl.habit.name} keeps its streak.`, mood: 'relieved' });
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
        <Txt size={30} w={900} ls={-0.7} style={{ marginTop: 12 }}>Streak saved</Txt>
        <Txt size={16} w={400} color={p.secondary} align="center" lh={1.45} style={{ marginTop: 8, maxWidth: 290 }}>
          {currentStreak(state, saved.habit, today) > saved.lost
            ? `${saved.habit.name} keeps its ${unit(saved.lost)}, and ${saved.unit === 'weeks' ? 'this week' : 'today'} makes it ${saved.lost + 1}.`
            : `${saved.habit.name} keeps its ${unit(saved.lost)}. ${saved.unit === 'weeks' ? 'This week’s a fresh one' : 'Today’s a fresh one'}, so let’s make it ${saved.lost + 1}.`}
        </Txt>
        <ShieldInventory ready={ready} nextIn={nextIn} />
        <View style={{ flex: 1, minHeight: 28 }} />
        <Button label={saved.unit === 'weeks' ? 'Back to this week' : 'Back to today'} onPress={() => setSaved(null)} style={{ alignSelf: 'stretch', marginBottom: 20 }} />
      </Sheet>
    );
  }

  const peek = (
    <View style={{ alignItems: 'center', marginBottom: -46 }}><Pip mood="droopy" size={110} shadow={false} /></View>
  );
  const hands = <>
    <View pointerEvents="none" style={{ position: 'absolute', left: '50%', marginLeft: -44, top: 72, width: 24, height: 17, borderRadius: 12, backgroundColor: '#EBD9BB' }} />
    <View pointerEvents="none" style={{ position: 'absolute', left: '50%', marginLeft: 20, top: 72, width: 24, height: 17, borderRadius: 12, backgroundColor: '#EBD9BB' }} />
  </>;
  const pill = (
    <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingLeft: 10, paddingRight: 14, borderRadius: 16, backgroundColor: p.dark ? accentFor('lavender', p).tint : SHIELD.tint }}>
      <Icon n="shield" c={SHIELD.base} s={18} c2={p.dark ? p.surface : SHIELD.tint} />
      <Txt size={14} w={800} color={p.dark ? SHIELD.base : '#6A4FD0'}>{shieldLine}</Txt>
    </View>
  );

  // Two or more slips at once: one list, pick which to save.
  if (slips.length > 1) {
    const sel = picked ?? slips.slice(0, ready).map(x => x.key);
    const toggle = (k: string) => setPicked(sel.includes(k) ? sel.filter(x => x !== k) : sel.length < ready ? [...sel, k] : sel);
    const useShields = () => {
      successHaptic();
      sel.forEach(k => spendShield(k));
      slips.filter(x => !sel.includes(x.key)).forEach(x => dismissSlip(x.key));
      toast.show({ text: `${sel.length === 1 ? 'Streak' : `${sel.length} streaks`} saved. Onwards!`, mood: 'relieved' });
      setPicked(null);
    };
    const fresh = () => { slips.forEach(x => dismissSlip(x.key)); setPicked(null); };
    return (
      <Sheet visible onClose={() => onLater(slips.map(x => x.key))} scrim={SCRIM} above={peek} overEdge={hands}
        style={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' }}>
        <Handle />
        <Txt size={28} w={900} ls={-0.6} lh={1.1} align="center" style={{ marginTop: 18, maxWidth: 300 }} accessibilityRole="header">
          {`${slips.length} streaks slipped`}
        </Txt>
        <Txt size={16} w={400} color={p.secondary} style={{ marginTop: 6 }}>Pick the ones worth saving.</Txt>
        {pill}
        <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 16 }}>
          {slips.map(x => {
            const on = sel.includes(x.key), c = accentFor(x.habit.color, p);
            return (
              <Pressable key={x.key} onPress={() => toggle(x.key)} disabled={ready === 0} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: ready === 0 }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, borderRadius: 18, backgroundColor: on ? c.tint : p.bg }}>
                <Icon n="flame" c={c.base} s={24} />
                <View style={{ flex: 1 }}>
                  <Txt size={16} w={800} numberOfLines={1}>{x.habit.name}</Txt>
                  <Txt size={13} w={700} color={p.secondary}>{`${x.lost} ${x.unit === 'weeks' ? 'wk' : 'days'} at stake`}</Txt>
                </View>
                {ready > 0 ? (
                  <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: on ? 0 : 2, borderColor: p.handle, backgroundColor: on ? SHIELD.base : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <Icon n="check" c="#fff" s={16} /> : null}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {ready > 0 ? <Button label={sel.length ? `Use ${sel.length} shield${sel.length === 1 ? '' : 's'}` : 'Pick one to save'} icon="shield" disabled={!sel.length} onPress={useShields} style={{ marginTop: 20, alignSelf: 'stretch' }} /> : null}
        <Button label="Start fresh today" variant={ready > 0 ? 'secondary' : 'primary'} onPress={fresh} style={{ marginTop: ready > 0 ? 12 : 20, alignSelf: 'stretch' }} />
      </Sheet>
    );
  }

  const s = shown;
  const edge = ACCENTS[s.habit.color].edge;
  return (
    <Sheet visible onClose={() => onLater([s.key])} scrim={SCRIM} above={peek} overEdge={hands}
      style={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' }}>
      <Handle />
      <FlameNumber flame={mix(a.base, '#FFFFFF', 0.6)} ink={edge} n={s.lost} struck
        crack={<Svg width={96} height={96} viewBox="0 0 24 24" style={{ position: 'absolute', top: 0 }}>
          <Path d="M12.6 6.2L10.8 10.6L13.2 12.4L11.2 17.6" fill="none" stroke={edge} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>} />
      <Txt size={28} w={900} ls={-0.6} lh={1.1} align="center" style={{ marginTop: 12, maxWidth: 300 }} accessibilityRole="header">
        {`Your ${streakNoun(s.habit)} streak slipped`}
      </Txt>
      <Txt size={16} w={400} color={p.secondary} style={{ marginTop: 8 }}>{`${unit(s.lost)} is worth saving.`}</Txt>
      {pill}
      {ready > 0 ? <Button label="Use a shield" icon="shield" onPress={rescue} style={{ marginTop: 22, alignSelf: 'stretch' }} /> : null}
      <Button label="Start fresh today" variant={ready > 0 ? 'secondary' : 'primary'} onPress={() => dismissSlip(s.key)} style={{ marginTop: ready > 0 ? 14 : 22, alignSelf: 'stretch' }} />
      {s.unit !== 'weeks' ? (
        <Pressable onPress={() => didIt(s)} accessibilityRole="button" hitSlop={6} style={{ marginTop: 10, minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}>
          <Txt size={15} w={800} color={p.headline}>{`I did it — log ${s.period === addDays(today, -1) ? 'yesterday' : weekdayName(s.period)}`}</Txt>
        </Pressable>
      ) : null}
    </Sheet>
  );
}

/** The flame with its number underneath, the same on both sheets so before and after read as one object. */
function FlameNumber({ flame, ink, n, struck, crack, children }: { flame: string; ink: string; n: number; struck?: boolean; crack?: ReactNode; children?: ReactNode }) {
  return (
    <View style={{ marginTop: 18, alignItems: 'center' }}>
      <View style={{ width: 150, height: 96, alignItems: 'center', justifyContent: 'center' }}>
        {children}
        <Icon n="flame" c={flame} c2="#FFFFFF" s={96} />
        {crack}
      </View>
      <Animated.View entering={FadeIn.duration(300)}>
        <Txt size={40} w={900} ls={-1} color={ink} strike={struck ? ink : undefined} style={{ lineHeight: 46 }}>{n}</Txt>
      </Animated.View>
    </View>
  );
}

/** Shields as objects: filled ones are ready, the outline is the next one being earned. */
function ShieldInventory({ ready, nextIn }: { ready: number; nextIn: number }) {
  const p = usePalette();
  return (
    <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: p.rest }}
      accessibilityLabel={`${ready} shields ready, next one in ${nextIn} days`}>
      {Array.from({ length: Math.min(ready, 5) }, (_, i) => <Icon key={i} n="shield" c={SHIELD.base} c2={p.rest} s={18} />)}
      <View style={{ opacity: 0.45 }}><Icon n="shield" c={p.tertiary} c2={p.rest} s={18} /></View>
      <Txt size={13} w={800} color={p.secondary}>{`next in ${nextIn} day${nextIn === 1 ? '' : 's'}`}</Txt>
    </View>
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
    <FlameNumber flame={base} ink={ink} n={n}
      crack={(
        <Animated.View entering={ZoomIn.duration(360).easing(springEaseFn)} style={{ position: 'absolute', right: 10, bottom: -8, paddingBottom: 3 }}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, borderRadius: 23, backgroundColor: SHIELD.edge }} />
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="shield" c={SHIELD.edge} c2={p.surface} s={30} />
          </View>
        </Animated.View>
      )}>
      <Animated.View style={[{ position: 'absolute', width: 150, height: 150, top: -27 }, glowStyle]}>
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
    </FlameNumber>
  );
}

/** "meditation", "reading"… for the starter habits; the habit's own name otherwise. */
const NOUNS: Record<string, string> = { water: 'water', gym: 'gym', read: 'reading', meditate: 'meditation', walk: 'walking', sleep: 'sleep', eat: 'eating-well' };
function streakNoun(h: Habit): string {
  const t = TEMPLATES.find(x => x.name === h.name && x.icon === h.icon);
  return t ? NOUNS[t.id] : h.name.toLowerCase();
}
