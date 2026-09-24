import { Asset } from 'expo-asset';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';
import type { IconName } from '@/components/Icon';
import type { PipMood } from '@/components/Pip';
import { ACCENTS } from '@/theme/colors';
import { addDays, parseDay, type DayKey } from '@/state/dates';
import { count, dueOn, isDone, statusOn, target, weekCount } from '@/state/logic';
import type { State } from '@/state/types';
import type { SproutWidgetProps, WidgetRow } from './SproutWidget';

// Keeps the iOS home screen widget in step with the app. The widget gets a
// short timeline: now, 8 pm (dusk, droopy Pip if anything is left) and
// midnight (tomorrow's fresh badge).

const SYMBOL: Partial<Record<IconName, SFSymbol>> = {
  drop: 'drop.fill', dumbbell: 'dumbbell.fill', book: 'book.fill', lotus: 'figure.mind.and.body', shoe: 'figure.walk',
  moon: 'moon.fill', apple: 'fork.knife', sprout: 'leaf.fill', sun: 'sun.max.fill', bell: 'bell.fill',
};

const PIPS: Record<'expectant' | 'happy' | 'cheering' | 'droopy' | 'sleepy', number> = {
  expectant: require('../../assets/widget/pip-expectant.png'),
  happy: require('../../assets/widget/pip-happy.png'),
  cheering: require('../../assets/widget/pip-cheering.png'),
  droopy: require('../../assets/widget/pip-droopy.png'),
  sleepy: require('../../assets/widget/pip-sleepy.png'),
};

type WidgetMood = keyof typeof PIPS;

/** Pip's mood follows the same rules as Home. */
export function widgetMood(done: number, total: number, hour: number): WidgetMood {
  if (total > 0 && done === total) return 'cheering';
  if (hour >= 23 || hour < 5) return 'sleepy';
  if (hour >= 20) return 'droopy';
  return done > 0 ? 'happy' : 'expectant';
}

export function widgetProps(s: State, day: DayKey, at: Date, pipPath: (m: PipMood) => string | null): SproutWidgetProps {
  const due = dueOn(s, day);
  const done = due.filter(h => isDone(s, h, day)).length;
  const hour = at.getHours();
  const evening = hour >= 20 && done < due.length;
  const d = parseDay(day);
  const label = evening ? 'TONIGHT' : `${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()]} ${d.getDate()}`;
  const rows: WidgetRow[] = due.map(h => {
    const sch = h.schedule;
    const progress = sch.kind === 'thru' ? count(s, h, day) / target(h) : sch.kind === 'week' ? weekCount(s, h, day, day) / sch.perWeek : 0;
    return { name: h.name, symbol: SYMBOL[h.icon] ?? 'leaf.fill', base: ACCENTS[h.color].base, tint: ACCENTS[h.color].tint, progress, done: statusOn(s, h, day) === 'done' };
  });
  return {
    label, done, total: due.length, evening, rows,
    pip: pipPath(widgetMood(done, due.length, hour)),
    bubble: evening ? 'Still time for a couple.' : null,
  };
}

let copied: Promise<Record<string, string>> | null = null;

/** Copy Pip's mood images into the app-group directory the widget can read. */
function sharedPips(dir: string): Promise<Record<string, string>> {
  copied ??= (async () => {
    const { File, Directory } = await import('expo-file-system');
    const out: Record<string, string> = {};
    const target = new Directory(dir);
    for (const [mood, mod] of Object.entries(PIPS)) {
      const [asset] = await Asset.loadAsync(mod);
      if (!asset.localUri) continue;
      const dest = new File(target, `pip-${mood}.png`);
      if (!dest.exists) new File(asset.localUri).copySync(dest);
      out[mood] = dest.uri.replace(/^file:\/\//, '');
    }
    return out;
  })().catch(() => ({}));
  return copied;
}

export function useWidgetSync(state: State, ready: boolean, today: DayKey) {
  const sig = JSON.stringify([today, state.logs[today] ?? {}, state.habits, state.onboarded]);
  useEffect(() => {
    if (Platform.OS !== 'ios' || !ready || !state.onboarded) return;
    const t = setTimeout(async () => {
      try {
        const { widgetsDirectory } = await import('expo-widgets');
        const Widget = (await import('./SproutWidget')).default;
        const paths = widgetsDirectory ? await sharedPips(widgetsDirectory) : {};
        const pip = (m: PipMood) => paths[m] ?? null;
        const now = new Date();
        const eight = new Date(now); eight.setHours(20, 0, 0, 0);
        const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
        const entries = [{ date: now, props: widgetProps(state, today, now, pip) }];
        if (now < eight) entries.push({ date: eight, props: widgetProps(state, today, eight, pip) });
        const tomorrow = addDays(today, 1);
        entries.push({ date: midnight, props: widgetProps(state, tomorrow, new Date(parseDay(tomorrow).setHours(8)), pip) });
        Widget.updateTimeline(entries);
      } catch {
        // Widgets need a development build with the widget extension; nothing to do in Expo Go.
      }
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, ready]);
}
