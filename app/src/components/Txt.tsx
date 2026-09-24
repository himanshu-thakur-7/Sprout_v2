import { Text, type TextProps, type TextStyle } from 'react-native';
import { usePalette } from '@/theme/ThemeProvider';

export type Weight = 400 | 600 | 700 | 800 | 900;

// Custom fonts need one family per weight; fontWeight alone is unreliable on Android.
export const FONT: Record<Weight, string> = {
  400: 'Nunito_400Regular',
  600: 'Nunito_600SemiBold',
  700: 'Nunito_700Bold',
  800: 'Nunito_800ExtraBold',
  900: 'Nunito_900Black',
};

type Props = TextProps & {
  size?: number;
  w?: Weight;
  color?: string;
  ls?: number;
  lh?: number;
  align?: TextStyle['textAlign'];
  caps?: boolean;
  strike?: string;
};

/** Nunito text. Defaults to Body: SemiBold 600 · 16 in ink. */
export function Txt({ size = 16, w = 600, color, ls = 0, lh, align, caps, strike, style, ...rest }: Props) {
  const p = usePalette();
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: FONT[w],
          fontSize: size,
          color: color ?? p.ink,
          letterSpacing: ls,
          lineHeight: lh ? size * lh : undefined,
          textAlign: align,
          textTransform: caps ? 'uppercase' : undefined,
        },
        strike ? { textDecorationLine: 'line-through', textDecorationColor: strike } : null,
        style,
      ]}
    />
  );
}
