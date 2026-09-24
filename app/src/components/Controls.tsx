import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { GOLD, GREEN } from '@/theme/colors';
import { usePalette } from '@/theme/ThemeProvider';
import { WEEKDAY_LETTERS } from '@/state/dates';
import { Icon } from './Icon';
import { Txt } from './Txt';

/** Round sand −/+ button. */
export function StepButton({ kind, onPress, size = 40, disabled }: { kind: 'minus' | 'plus'; onPress: () => void; size?: number; disabled?: boolean }) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} accessibilityRole="button" accessibilityLabel={kind === 'plus' ? 'More' : 'Less'}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, backgroundColor: p.fill, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}>
      <Icon n={kind} c={p.ink} s={size >= 40 ? 18 : 14} />
    </Pressable>
  );
}

/** − [label] + */
export function Stepper({ label, onDown, onUp, min, max, value, minWidth = 140, size = 40, children }: {
  label?: string; onDown: () => void; onUp: () => void; value: number; min: number; max: number; minWidth?: number; size?: number; children?: ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <StepButton kind="minus" onPress={onDown} disabled={value <= min} size={size} />
      <View style={{ minWidth, alignItems: 'center' }}>{children ?? <Txt size={17} w={800} align="center">{label}</Txt>}</View>
      <StepButton kind="plus" onPress={onUp} disabled={value >= max} size={size} />
    </View>
  );
}

/** M T W T F S S — on days sit on a hard ledge in the accent. */
export function DayToggles({ days, onToggle, base, edge, onText = '#FFFFFF', size = 36 }: {
  days: boolean[]; onToggle: (i: number) => void; base: string; edge: string; onText?: string; size?: number;
}) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {WEEKDAY_LETTERS.map((l, i) => {
        const on = days[i];
        return (
          <Pressable key={i} onPress={() => onToggle(i)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
            accessibilityLabel={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]}>
            <View style={{ paddingBottom: on ? 3 : 0, marginBottom: on ? 0 : 3 }}>
              {on ? <View style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, borderRadius: size / 2, backgroundColor: edge }} /> : null}
              <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: on ? base : p.fill, alignItems: 'center', justifyContent: 'center' }}>
                <Txt size={14} w={900} color={on ? onText : p.secondary}>{l}</Txt>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** "1/4 ◔" — counts only habits due today. Turns into a check on a gold ledge at 4/4. */
export function DailyBadge({ done, total }: { done: number; total: number }) {
  const p = usePalette();
  const all = total > 0 && done === total;
  const R = 11, C = 2 * Math.PI * R;
  return (
    <View style={{ paddingBottom: 3 }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, borderRadius: 24, backgroundColor: all ? GOLD.ledge : p.line }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5, paddingLeft: 14, paddingRight: 5, borderRadius: 24, backgroundColor: p.surface }}
        accessibilityLabel={`${done} of ${total} done today`}>
        <Txt size={17} w={900} ls={-0.3}>{`${done}/${total}`}</Txt>
        {all ? (
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: GREEN.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="check" c="#fff" s={18} />
          </View>
        ) : (
          <Svg width={30} height={30} viewBox="0 0 30 30">
            <Circle cx={15} cy={15} r={R} fill="none" stroke={p.line} strokeWidth={4.5} />
            {done > 0 ? (
              <Circle cx={15} cy={15} r={R} fill="none" stroke={GREEN.primary} strokeWidth={4.5} strokeLinecap="round"
                strokeDasharray={[(C * done) / total, C]} transform="rotate(-90 15 15)" />
            ) : null}
          </Svg>
        )}
      </View>
    </View>
  );
}

/** Pip's speech bubble: tail at bottom-left, neutral ledge. */
export function Bubble({ text, maxWidth = 116 }: { text: string; maxWidth?: number }) {
  const p = usePalette();
  return (
    <View style={{ paddingBottom: 3, maxWidth }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, borderRadius: 16, borderBottomLeftRadius: 4, backgroundColor: p.line }} />
      <View style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, borderBottomLeftRadius: 4, backgroundColor: p.surface }}>
        <Txt size={13} w={700} lh={1.3}>{text}</Txt>
      </View>
    </View>
  );
}

/** Week | Month */
export function Segmented<T extends string>({ options, value, onChange, width = 210 }: { options: [T, string][]; value: T; onChange: (v: T) => void; width?: number }) {
  const p = usePalette();
  return (
    <View style={{ width, flexDirection: 'row', padding: 4, borderRadius: 18, backgroundColor: p.fill }}>
      {options.map(([id, label]) => {
        const on = id === value;
        return (
          <Pressable key={id} onPress={() => onChange(id)} style={{ flex: 1 }} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <View style={{ paddingBottom: on ? 2 : 0, marginBottom: on ? 0 : 2 }}>
              {on ? <View style={{ position: 'absolute', left: 0, right: 0, top: 2, bottom: 0, borderRadius: 14, backgroundColor: p.dark ? p.line : '#E3D8C4' }} /> : null}
              <View style={{ height: 36, borderRadius: 14, backgroundColor: on ? p.surface : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <Txt size={15} w={800} color={on ? p.ink : '#8C887F'}>{label}</Txt>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Onboarding progress dots: the current step is a 24pt green pill. */
export function StepDots({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: i === step ? GREEN.primary : '#DCCFB8' }} />
      ))}
    </View>
  );
}

/** Tick mark for tiny done indicators. */
export function Tick({ s = 12 }: { s?: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={s} height={s}>
      <Path d="M6.5 12.5l3.8 3.7 7.2-7.7" fill="none" stroke="#fff" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
