// Sprout palette — mirrors "Sprout Design System" §01 Color.

export type AccentId = 'sky' | 'tangerine' | 'sunflower' | 'lavender' | 'teal' | 'coral' | 'berry' | 'leaf';

export type Accent = {
  id: AccentId;
  name: string;
  /** Fills icons, rings and flames. */
  base: string;
  /** The hard 4px ledge. */
  edge: string;
  /** Behind icons and ring tracks. */
  tint: string;
  /** Deeper shade for streak numbers and small text on white. */
  ink: string;
};

export const ACCENTS: Record<AccentId, Accent> = {
  sky: { id: 'sky', name: 'Sky blue', base: '#4DA8F0', edge: '#3A8BD1', tint: '#E3F0FC', ink: '#2F86D0' },
  tangerine: { id: 'tangerine', name: 'Tangerine', base: '#FF9F43', edge: '#E0822A', tint: '#FFEBD8', ink: '#D9731A' },
  sunflower: { id: 'sunflower', name: 'Sunflower', base: '#FFC83D', edge: '#E0AC22', tint: '#FFF4D1', ink: '#C28E0A' },
  lavender: { id: 'lavender', name: 'Lavender', base: '#A78BFA', edge: '#8B6FE0', tint: '#EEE8FE', ink: '#7A5CE0' },
  teal: { id: 'teal', name: 'Teal', base: '#2EC4B6', edge: '#22A396', tint: '#DDF6F3', ink: '#1A978A' },
  coral: { id: 'coral', name: 'Coral', base: '#FF7A6B', edge: '#E0604F', tint: '#FFE6E2', ink: '#D9533F' },
  berry: { id: 'berry', name: 'Berry', base: '#E056A0', edge: '#C03E84', tint: '#FBE3F0', ink: '#C03E84' },
  leaf: { id: 'leaf', name: 'Leaf green', base: '#58C27D', edge: '#3E9A5C', tint: '#E3F5E9', ink: '#3E9A5C' },
};

/** Swatch order used by the Add habit sheet. */
export const SWATCH_ORDER: AccentId[] = ['leaf', 'sky', 'sunflower', 'coral', 'lavender', 'tangerine', 'teal', 'berry'];

/** Accents whose base is too pale for white text (headers switch to ink). */
export const LIGHT_ACCENTS: AccentId[] = ['sunflower'];

export const GREEN = {
  primary: '#58C27D',
  edge: '#3E9A5C',
  headline: '#2F6B45',
  tint: '#E3F5E9',
  darkHeadline: '#7FD49C',
};

export const GOLD = { base: '#FFC83D', edge: '#E0AC22', ink: '#C28E0A', ledge: '#EBD28A', glow: '#FFE08A' };

export const PIP = {
  body: '#F3E6CF',
  shade: '#EAD7B7',
  arm: '#EBD9BB',
  foot: '#E6D1AD',
  leaf: '#58C27D',
  stem: '#4AAE6C',
  eyes: '#1F3A2A',
  blush: '#F7A8A0',
};

export type Palette = {
  dark: boolean;
  bg: string;
  surface: string;
  /** Hill behind Pip, segmented track, stepper buttons. */
  fill: string;
  /** Neutral ledge + borders. */
  line: string;
  /** Hairline dividers inside cards. */
  divider: string;
  ink: string;
  secondary: string;
  tertiary: string;
  label: string;
  /** Resting-card fill (dashed border cards, not-done calendar cells). */
  rest: string;
  restLine: string;
  missed: string;
  handle: string;
  scrim: string;
  headline: string;
  navBg: string;
  navInactive: string;
  navInactiveText: string;
  navActiveText: string;
};

export const LIGHT: Palette = {
  dark: false,
  bg: '#FBF7F0',
  surface: '#FFFFFF',
  fill: '#F1E7D6',
  line: '#ECE4D6',
  divider: '#F3EDE2',
  ink: '#1F2A24',
  secondary: '#6B6F66',
  tertiary: '#B5B1A8',
  label: '#9A968D',
  rest: '#F6F0E5',
  restLine: '#E3D8C4',
  missed: '#EFE7DA',
  handle: '#D5CDBF',
  scrim: 'rgba(31,42,36,0.42)',
  headline: GREEN.headline,
  navBg: '#FFFFFF',
  navInactive: '#B5B1A8',
  navInactiveText: '#9A968D',
  navActiveText: GREEN.headline,
};

export const DARK: Palette = {
  dark: true,
  bg: '#131915',
  surface: '#1D2520',
  fill: '#1A221D',
  line: '#2A332D',
  divider: '#262E29',
  ink: '#F2EEE6',
  secondary: '#A3A89E',
  tertiary: '#7E847C',
  label: '#7E847C',
  rest: '#171E19',
  restLine: '#2A332D',
  missed: '#26302A',
  handle: '#3A443D',
  scrim: 'rgba(0,0,0,0.55)',
  headline: GREEN.darkHeadline,
  navBg: '#1A211C',
  navInactive: '#5E665F',
  navInactiveText: '#7E847C',
  navActiveText: GREEN.darkHeadline,
};

/** Mix two hex colours in sRGB (a close stand-in for the prototype's oklab color-mix). */
export function mix(a: string, b: string, amountOfA: number): string {
  const pa = parseHex(a), pb = parseHex(b);
  const ch = (i: number) => Math.round(pa[i] * amountOfA + pb[i] * (1 - amountOfA));
  return '#' + [ch(0), ch(1), ch(2)].map(v => v.toString(16).padStart(2, '0')).join('');
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Accent adjusted for the active palette: in dark mode tints are 24% of the accent over the card and ink becomes base. */
export function accentFor(id: AccentId, p: Palette): Accent {
  const a = ACCENTS[id] ?? ACCENTS.leaf;
  if (!p.dark) return a;
  return { ...a, tint: mix(a.base, p.surface, 0.24), ink: a.base };
}
