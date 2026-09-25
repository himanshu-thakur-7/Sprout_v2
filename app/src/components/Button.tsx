import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { GREEN } from '@/theme/colors';
import { usePalette } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Ledge } from './Ledge';
import { Txt } from './Txt';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  icon?: IconName;
  iconC2?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** Pill buttons: Primary (green on #3E9A5C ledge), Secondary (white, 2px border), Disabled (flat sand). */
export function Button({ label, onPress, variant = 'primary', icon, iconC2, disabled, style }: Props) {
  const p = usePalette();
  if (disabled) {
    return (
      <View style={[{ height: 56, borderRadius: 28, backgroundColor: p.dark ? p.line : '#ECE4D6', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }, style]}
        accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel={label}>
        <Txt size={18} w={900} color={p.hint}>{label}</Txt>
      </View>
    );
  }
  if (variant === 'secondary') {
    return (
      <Ledge edge={p.line} radius={28} onPress={onPress} duration={120} outerStyle={style} accessibilityLabel={label}
        style={{ height: 52, backgroundColor: p.surface, borderWidth: 2, borderColor: p.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {icon ? <Icon n={icon} c={p.ink} s={22} /> : null}
        <Txt size={17} w={800}>{label}</Txt>
      </Ledge>
    );
  }
  return (
    <Ledge edge={GREEN.buttonEdge} radius={28} onPress={onPress} duration={120} outerStyle={style} accessibilityLabel={label}
      style={{ height: 56, backgroundColor: GREEN.button, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {icon ? <Icon n={icon} c="#FFFFFF" c2={iconC2 ?? GREEN.button} s={22} /> : null}
      <Txt size={18} w={900} color="#FFFFFF">{label}</Txt>
    </Ledge>
  );
}
