import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { dayKey, type DayKey } from './dates';
import { isDone, target } from './logic';
import { demoState, EMPTY_STATE, newId } from './seed';
import type { Habit, State } from './types';

const KEY = 'sprout:v1';

/**
 * What a tap on today's check did:
 * - logged: a counter moved on but isn't full yet
 * - completed: the habit just landed (confetti time)
 * - full: a full counter was tapped again; nothing changed
 * - unchecked: a done habit was unticked (offer Undo)
 */
export type TapResult = { kind: 'logged' | 'completed' | 'full' | 'unchecked'; prev: number; firstEver: boolean };

type Actions = {
  tap: (id: string) => TapResult | null;
  /** Take one back (counters, perfect-day list). */
  untap: (id: string) => void;
  /** Set a day's count directly: undo, and backfilling the last 7 days from the calendar. */
  setCount: (id: string, day: DayKey, n: number) => void;
  addHabit: (h: Omit<Habit, 'id' | 'createdAt'>) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  archiveHabit: (id: string) => void;
  restoreHabit: (id: string) => void;
  pauseHabit: (id: string) => void;
  resumeHabit: (id: string) => void;
  markCelebrated: (day: DayKey) => void;
  finishOnboarding: (habits: Omit<Habit, 'id' | 'createdAt'>[]) => void;
  loadDemo: () => void;
  spendShield: (slipKey: string) => void;
  dismissSlip: (slipKey: string) => void;
  markRecapSeen: (week: string) => void;
  setSettings: (patch: Partial<State['settings']>) => void;
  setName: (name: string) => void;
  reset: () => void;
};

type Ctx = { state: State; today: DayKey; now: Date; ready: boolean; saveFailed: boolean } & Actions;

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const now = useNow();
  const today = dayKey(now);
  const todayRef = useRef(today);

  const [saveFailed, setSaveFailed] = useState(false);

  // Hydrate once, then persist every change (debounced). A failed save is surfaced, not swallowed.
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(raw => { if (raw) setState(migrate({ ...EMPTY_STATE, ...JSON.parse(raw) }, dayKey(new Date()))); })
      .catch(e => console.warn('Sprout: could not load saved data', e))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      AsyncStorage.setItem(KEY, JSON.stringify(state))
        .then(() => setSaveFailed(false))
        .catch(e => { console.warn('Sprout: could not save', e); setSaveFailed(true); });
    }, 250);
    return () => clearTimeout(t);
  }, [state, ready]);

  const stateRef = useRef(state);
  useEffect(() => { todayRef.current = today; stateRef.current = state; }, [today, state]);

  /**
   * Apply a change to one day's entry (today by default). The same pure update goes to React
   * state and, synchronously, to stateRef, so rapid taps see each other before the next render.
   */
  const setEntry = useCallback((id: string, fn: (n: number, h: Habit) => number, day?: DayKey) => {
    const d = day ?? todayRef.current, t = minutesNow();
    const apply = (s: State): State => {
      const h = s.habits.find(x => x.id === id);
      if (!h) return s;
      const n = fn(s.logs[d]?.[id]?.n ?? 0, h);
      const day = { ...(s.logs[d] ?? {}) };
      if (n <= 0) delete day[id];
      else day[id] = { n, t };
      return { ...s, logs: { ...s.logs, [d]: day } };
    };
    stateRef.current = apply(stateRef.current);
    setState(apply);
  }, []);

  const actions = useMemo<Actions>(() => ({
    tap: id => {
      const s = stateRef.current, h = s.habits.find(x => x.id === id);
      if (!h) return null;
      const d = todayRef.current, t = target(h), prev = s.logs[d]?.[id]?.n ?? 0;
      const firstEver = !s.firstChecks.includes(id) && !Object.values(s.logs).some(day => day[id]);
      // Counters add one per tap and stop when full. Everything else toggles.
      if (t > 1 && prev >= t) return { kind: 'full', prev, firstEver: false };
      if (t === 1 && prev >= 1) {
        setEntry(id, () => 0);
        return { kind: 'unchecked', prev, firstEver: false };
      }
      setEntry(id, n => n + 1);
      const completed = isDone(stateRef.current, h, d);
      if (completed && firstEver) setState(st => ({ ...st, firstChecks: [...st.firstChecks, id] }));
      return { kind: completed ? 'completed' : 'logged', prev, firstEver: completed && firstEver };
    },
    untap: id => setEntry(id, n => n - 1),
    setCount: (id, day, n) => setEntry(id, () => n, day),
    addHabit: h => setState(s => ({
      ...s,
      habits: [...s.habits, { ...h, id: newId(), createdAt: todayRef.current }],
      profile: { ...s.profile, since: s.profile.since ?? todayRef.current },
    })),
    updateHabit: (id, patch) => setState(s => ({ ...s, habits: s.habits.map(h => (h.id === id ? { ...h, ...patch } : h)) })),
    archiveHabit: id => setState(s => ({ ...s, habits: s.habits.map(h => (h.id === id ? { ...h, archivedAt: todayRef.current } : h)) })),
    restoreHabit: id => setState(s => ({ ...s, habits: s.habits.map(h => (h.id === id ? { ...h, archivedAt: undefined, archived: false } : h)) })),
    pauseHabit: id => setState(s => ({
      ...s, habits: s.habits.map(h => (h.id === id && !h.pauses?.some(p => !p.to) ? { ...h, pauses: [...(h.pauses ?? []), { from: todayRef.current }] } : h)),
    })),
    resumeHabit: id => setState(s => ({
      ...s,
      habits: s.habits.map(h => (h.id === id ? {
        ...h, paused: false,
        // Resuming the same day it was paused simply removes the pause.
        pauses: (h.pauses ?? []).flatMap(p => (p.to ? [p] : p.from >= todayRef.current ? [] : [{ ...p, to: todayRef.current }])),
      } : h)),
    })),
    markCelebrated: day => setState(s => (s.celebrated.includes(day) ? s : { ...s, celebrated: [...s.celebrated.slice(-60), day] })),
    finishOnboarding: hs => setState(s => ({
      ...s,
      onboarded: true,
      habits: [...s.habits, ...hs.map(h => ({ ...h, id: newId(), createdAt: todayRef.current }))],
      profile: { ...s.profile, since: s.profile.since ?? todayRef.current },
    })),
    loadDemo: () => setState(demoState(todayRef.current)),
    spendShield: key => setState(s => ({ ...s, shielded: [...s.shielded, key] })),
    dismissSlip: key => setState(s => ({ ...s, dismissedSlips: [...s.dismissedSlips, key] })),
    markRecapSeen: week => setState(s => (s.recapSeen.includes(week) ? s : { ...s, recapSeen: [...s.recapSeen, week] })),
    setSettings: patch => setState(s => ({ ...s, settings: { ...s.settings, ...patch } })),
    setName: name => setState(s => ({ ...s, profile: { ...s.profile, name } })),
    reset: () => setState(EMPTY_STATE),
  }), [setEntry]);

  const value = useMemo(() => ({ state, today, now, ready, saveFailed, ...actions }), [state, today, now, ready, saveFailed, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}

/** Bring older saves up to date: boolean pause/archive flags become dated ranges. */
function migrate(s: State, today: DayKey): State {
  return {
    ...s,
    habits: s.habits.map(h => ({
      ...h,
      pauses: h.pauses ?? (h.paused ? [{ from: today }] : undefined),
      archivedAt: h.archivedAt ?? (h.archived ? today : undefined),
    })),
  };
}

const minutesNow = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

/** Current time, refreshed each minute and whenever the app comes back to the foreground. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const iv = setInterval(tick, 60_000);
    const sub = AppState.addEventListener('change', st => { if (st === 'active') tick(); });
    return () => { clearInterval(iv); sub.remove(); };
  }, []);
  return now;
}
