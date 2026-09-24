import type { IconName } from '@/components/Icon';
import type { AccentId } from '@/theme/colors';
import type { Schedule } from './types';

/** The seven starter tiles on onboarding "Pick a few to start", with a sensible default rhythm each. */
export type Template = { id: string; label: string; name: string; icon: IconName; color: AccentId; schedule: Schedule; reminder: number | null; unit?: string };

const everyDay = () => Array(7).fill(true);

export const TEMPLATES: Template[] = [
  { id: 'water', label: 'Water', name: 'Drink water', icon: 'drop', color: 'sky', schedule: { kind: 'thru', intervalHours: 2, startHour: 8, endHour: 22 }, reminder: null, unit: 'glasses' },
  { id: 'gym', label: 'Gym', name: 'Gym', icon: 'dumbbell', color: 'tangerine', schedule: { kind: 'week', perWeek: 4 }, reminder: 7 * 60 + 30 },
  { id: 'read', label: 'Read', name: 'Read', icon: 'book', color: 'sunflower', schedule: { kind: 'day', days: everyDay() }, reminder: 21 * 60 },
  { id: 'meditate', label: 'Meditate', name: 'Meditate', icon: 'lotus', color: 'lavender', schedule: { kind: 'day', days: everyDay() }, reminder: 7 * 60 + 30 },
  { id: 'walk', label: 'Walk', name: 'Walk', icon: 'shoe', color: 'teal', schedule: { kind: 'week', perWeek: 5 }, reminder: 12 * 60 + 30 },
  { id: 'sleep', label: 'Sleep', name: 'Sleep by 11', icon: 'moon', color: 'berry', schedule: { kind: 'day', days: everyDay() }, reminder: 22 * 60 + 30 },
  { id: 'eat', label: 'Eat well', name: 'Eat well', icon: 'apple', color: 'leaf', schedule: { kind: 'day', days: everyDay() }, reminder: 12 * 60 },
];

/** Guess an icon from a habit's name while the person types. */
export function guessIcon(name: string): IconName | null {
  const n = name.toLowerCase();
  const rules: [RegExp, IconName][] = [
    [/water|drink|hydrat|glass/, 'drop'], [/gym|lift|workout|weights|train|exercis/, 'dumbbell'], [/read|book|study/, 'book'],
    [/meditat|breath|yoga|calm|mindful/, 'lotus'], [/walk|run|step|jog|hike/, 'shoe'], [/sleep|bed|nap/, 'moon'],
    [/eat|fruit|veg|cook|meal|food/, 'apple'], [/plant|garden|grow/, 'sprout'], [/sun|outside|morning/, 'sun'],
  ];
  return rules.find(([re]) => re.test(n))?.[1] ?? null;
}
