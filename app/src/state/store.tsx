import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { dayKey, type DayKey } from './dates';
import { isDone, target } from './logic';
import { demoState, EMPTY_STATE, newId } from './seed';
import type { Habit, State } from './types';

const KEY = 'sprout:v1';

type Actions = {
  /** Log a tap on today's card. Returns true when this tap completed the habit (confetti time). */
  tap: (id: string) => boolean;
  /** Take one back (perfect-day list, undo). */
  untap: (id: string) => void;
  addHabit: (h: Omit<Habit, 'id' | 'createdAt'>) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  archiveHabit: (id: string) => void;
  finishOnboarding: (habits: Omit<Habit, 'id' | 'createdAt'>[]) => void;
  loadDemo: () => void;
  spendShield: (slipKey: string) => void;
  dismissSlip: (slipKey: string) => void;
  setSettings: (patch: Partial<State['settings']>) => void;
  setName: (name: string) => void;
  reset: () => void;
};

type Ctx = { state: State; today: DayKey; now: Date; ready: boolean } & Actions;

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const now = useNow();
  const today = dayKey(now);
  const todayRef = useRef(today);

  // Hydrate once, then persist every change (debounced).
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(raw => { if (raw) setState({ ...EMPTY_STATE, ...JSON.parse(raw) }); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => { AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {}); }, 250);
    return () => clearTimeout(t);
  }, [state, ready]);

  const stateRef = useRef(state);
  useEffect(() => { todayRef.current = today; stateRef.current = state; }, [today, state]);

  const setEntry = useCallback((id: string, fn: (n: number, h: Habit) => number) => {
    setState(s => {
      const h = s.habits.find(x => x.id === id);
      if (!h) return s;
      const d = todayRef.current;
      const n = fn(s.logs[d]?.[id]?.n ?? 0, h);
      const day = { ...(s.logs[d] ?? {}) };
      if (n <= 0) delete day[id];
      else day[id] = { n, t: minutesNow() };
      return { ...s, logs: { ...s.logs, [d]: day } };
    });
  }, []);

  const actions = useMemo<Actions>(() => ({
    tap: id => {
      const s = stateRef.current, h = s.habits.find(x => x.id === id);
      if (!h) return false;
      const d = todayRef.current, t = target(h), was = isDone(s, h, d);
      // Counters add one per tap; tapping a full counter takes one back. Others toggle.
      setEntry(id, n => (t > 1 ? (n >= t ? t - 1 : n + 1) : n >= 1 ? 0 : 1));
      const n = s.logs[d]?.[id]?.n ?? 0;
      return !was && (t > 1 ? n + 1 >= t : true);
    },
    untap: id => setEntry(id, n => n - 1),
    addHabit: h => setState(s => ({
      ...s,
      habits: [...s.habits, { ...h, id: newId(), createdAt: todayRef.current }],
      profile: { ...s.profile, since: s.profile.since ?? todayRef.current },
    })),
    updateHabit: (id, patch) => setState(s => ({ ...s, habits: s.habits.map(h => (h.id === id ? { ...h, ...patch } : h)) })),
    archiveHabit: id => setState(s => ({ ...s, habits: s.habits.map(h => (h.id === id ? { ...h, archived: true } : h)) })),
    finishOnboarding: hs => setState(s => ({
      ...s,
      onboarded: true,
      habits: [...s.habits, ...hs.map(h => ({ ...h, id: newId(), createdAt: todayRef.current }))],
      profile: { ...s.profile, since: s.profile.since ?? todayRef.current },
    })),
    loadDemo: () => setState(demoState(todayRef.current)),
    spendShield: key => setState(s => ({ ...s, shielded: [...s.shielded, key] })),
    dismissSlip: key => setState(s => ({ ...s, dismissedSlips: [...s.dismissedSlips, key] })),
    setSettings: patch => setState(s => ({ ...s, settings: { ...s.settings, ...patch } })),
    setName: name => setState(s => ({ ...s, profile: { ...s.profile, name } })),
    reset: () => setState(EMPTY_STATE),
  }), [setEntry]);

  const value = useMemo(() => ({ state, today, now, ready, ...actions }), [state, today, now, ready, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
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
