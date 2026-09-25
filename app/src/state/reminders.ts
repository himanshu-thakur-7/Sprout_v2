import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import type { IconName } from '@/components/Icon';
import type { DayKey } from './dates';
import { isLive, isPausedOn, target } from './logic';
import { eveningNudge } from './nudge';
import type { Habit, State } from './types';

// Local reminders. One gentle nudge when a habit is due, only for the habits
// that have a rhythm, and never more than asked for.

type N = typeof NotificationsModule;

// Expo Go on Android dropped expo-notifications in SDK 53: even importing it
// throws. There, reminders stay off; everywhere else the module loads lazily.
const expoGoAndroid = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const remindersSupported = Platform.OS !== 'web' && !expoGoAndroid;
const supported = remindersSupported;

let loaded: Promise<N> | null = null;
function notifications(): Promise<N> {
  loaded ??= import('expo-notifications').then(Notifications => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    });
    return Notifications;
  });
  return loaded;
}

/** Ask the OS. Called from onboarding step 04 after the soft "Can I nudge you?" screen. */
export async function askForReminders(): Promise<boolean> {
  if (!supported) return false;
  const Notifications = await notifications();
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

type Planned = { title: string; body: string; trigger: NotificationsModule.SchedulableNotificationTriggerInput };

export function plan(Notifications: N, h: Habit): Planned[] {
  const sch = h.schedule;
  if (sch.kind === 'thru') {
    const n = target(h);
    const thing = h.unit ? cap(singular(h.unit)) : h.name;
    return Array.from({ length: n }, (_, i) => ({
      title: `${thing} #${i + 1} time ${EMOJI[h.icon] ?? '🌱'}`,
      body: i === 0 ? 'Morning! The first one is the easiest.' : i + 1 === Math.ceil(n / 2) ? "Halfway there. I'm cheering from your pocket." : i === n - 1 ? 'Last one of the day. You’ve got this.' : 'A small one counts.',
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: sch.startHour + i * sch.intervalHours, minute: 0 },
    }));
  }
  if (h.reminder == null) return [];
  const hour = Math.floor(h.reminder / 60), minute = h.reminder % 60;
  if (sch.kind === 'week' || sch.days.every(Boolean)) {
    return [{
      title: `${h.name} ${EMOJI[h.icon] ?? '🌱'}`,
      body: sch.kind === 'week' ? `Fancy a little ${h.name.toLowerCase()} today? No pressure.` : 'Your moment. I’ll be right here.',
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    }];
  }
  // Expo weekdays: 1 = Sunday … 7 = Saturday. Ours: 0 = Monday … 6 = Sunday.
  return sch.days.flatMap((on, i) => (on ? [{
    title: `${h.name} ${EMOJI[h.icon] ?? '🌱'}`,
    body: 'Your moment. I’ll be right here.',
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: ((i + 1) % 7) + 1, hour, minute },
  } as Planned] : []));
}

const EMOJI: Partial<Record<IconName, string>> = {
  drop: '💧', dumbbell: '💪', book: '📖', lotus: '🧘', shoe: '👟', moon: '🌙', apple: '🍎', sprout: '🌱', sun: '☀️', bell: '🔔',
};

const NUDGE_ID = 'sprout-evening-nudge';
async function scheduleNudge(Notifications: N, s: State, today: DayKey) {
  await Notifications.cancelScheduledNotificationAsync(NUDGE_ID).catch(() => {});
  if (!s.settings.reminders) return;
  const n = eveningNudge(s, today, new Date());
  if (!n) return;
  await Notifications.scheduleNotificationAsync({
    identifier: NUDGE_ID,
    content: { title: n.title, body: n.body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.date },
  });
}

/** Keep scheduled reminders in step with habits and settings. */
export function useReminderSync(state: State, ready: boolean, today: DayKey) {
  const sig = JSON.stringify([
    state.settings.reminders,
    today,
    state.habits.filter(h => isLive(h, today) && !isPausedOn(h, today)).map(h => [h.id, h.name, h.schedule, h.reminder, h.unit]),
  ]);
  useEffect(() => {
    if (!supported || !ready || !state.onboarded) return;
    let cancelled = false;
    (async () => {
      const Notifications = await notifications();
      const perm = await Notifications.getPermissionsAsync();
      if (cancelled || !perm.granted) return;
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (!state.settings.reminders) return;
      for (const h of state.habits.filter(x => isLive(x, today) && !isPausedOn(x, today))) {
        for (const p of plan(Notifications, h)) {
          if (cancelled) return;
          await Notifications.scheduleNotificationAsync({ content: { title: p.title, body: p.body }, trigger: p.trigger });
        }
      }
      if (!cancelled) await scheduleNudge(Notifications, state, today);
    })().catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, ready]);

  // The evening nudge follows today's logs.
  const todaySig = JSON.stringify([today, state.logs[today] ?? {}, state.shielded.length]);
  useEffect(() => {
    if (!supported || !ready || !state.onboarded) return;
    const t = setTimeout(() => {
      notifications()
        .then(async Notifications => ((await Notifications.getPermissionsAsync()).granted ? scheduleNudge(Notifications, state, today) : undefined))
        .catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaySig, ready]);
}

const singular = (w: string) => (w.endsWith('sses') ? w.slice(0, -2) : w.endsWith('s') ? w.slice(0, -1) : w);
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
