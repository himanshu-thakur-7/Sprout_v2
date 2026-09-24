import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { DARK, LIGHT, type Palette } from './colors';

export type ThemePref = 'system' | 'light' | 'dark';

const ThemeContext = createContext<Palette>(LIGHT);

export function ThemeProvider({ pref, children }: { pref: ThemePref; children: ReactNode }) {
  const scheme = useColorScheme();
  const dark = pref === 'dark' || (pref === 'system' && scheme === 'dark');
  return <ThemeContext.Provider value={dark ? DARK : LIGHT}>{children}</ThemeContext.Provider>;
}

export const usePalette = () => useContext(ThemeContext);
