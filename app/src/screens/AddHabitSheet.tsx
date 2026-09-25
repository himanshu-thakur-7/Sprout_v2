import { router } from 'expo-router';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { DayToggles, Stepper } from '@/components/Controls';
import { HABIT_ICONS, Icon, type IconName } from '@/components/Icon';
import { Ledge } from '@/components/Ledge';
import { Pip } from '@/components/Pip';
import { Handle, Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { Txt, FONT } from '@/components/Txt';
import { ACCENTS, accentFor, GREEN, onAccent, SWATCH_ORDER, type AccentId } from '@/theme/colors';
import { springEaseFn } from '@/theme/motion';
import { usePalette } from '@/theme/ThemeProvider';
import { clockLabel, hourLabel } from '@/state/dates';
import { isLive } from '@/state/logic';
import { useStore } from '@/state/store';
import { guessIcon } from '@/state/templates';
import type { Habit, Schedule, State } from '@/state/types';
import { confirm } from '@/utils/confirm';

type Freq = Schedule['kind'];
type Draft = {
  name: string; color: AccentId; icon: IconName; iconPicked: boolean; freq: Freq; days: boolean[]; per: number;
  iv: number; start: number; end: number; unit: string; reminder: number; remindOn: boolean;
};

const MAX_NAME = 40;
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const UNITS = ['glasses', 'pages', 'sets', 'times'];
const PRESETS: [string, number][] = [['Morning', 7 * 60 + 30], ['Midday', 12 * 60 + 30], ['Evening', 21 * 60]];
/** Keep an unsaved, named draft this long after the sheet closes. */
const DRAFT_MS = 10 * 60 * 1000;

/** A fresh draft that doesn't look like the last habit: the first unused colour and icon, reminder off. */
function blank(s: State): Draft {
  const live = s.habits.filter(h => isLive(h, '9999-12-31'));
  const color = SWATCH_ORDER.find(k => !live.some(h => h.color === k)) ?? SWATCH_ORDER[live.length % SWATCH_ORDER.length];
  const icon = HABIT_ICONS.find(k => !live.some(h => h.icon === k)) ?? 'sprout';
  return { name: '', color, icon, iconPicked: false, freq: 'day', days: Array(7).fill(true), per: 3, iv: 2, start: 8, end: 22, unit: 'times', reminder: 9 * 60, remindOn: false };
}

function fromHabit(s: State, h: Habit): Draft {
  const d = blank(s);
  const sch = h.schedule;
  return {
    ...d, name: h.name, color: h.color, icon: h.icon, iconPicked: true, freq: sch.kind,
    days: sch.kind === 'day' ? [...sch.days] : d.days, per: sch.kind === 'week' ? sch.perWeek : d.per,
    iv: sch.kind === 'thru' ? sch.intervalHours : d.iv, start: sch.kind === 'thru' ? sch.startHour : d.start, end: sch.kind === 'thru' ? sch.endHour : d.end,
    unit: h.unit ?? d.unit, reminder: h.reminder ?? d.reminder, remindOn: h.reminder != null,
  };
}

type Ctx = { openAdd: () => void; openEdit: (h: Habit) => void };
const AddHabitContext = createContext<Ctx>({ openAdd: () => {}, openEdit: () => {} });
export const useAddHabit = () => useContext(AddHabitContext);

export function AddHabitProvider({ children }: { children: ReactNode }) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [draft, setDraft] = useState<Draft>(() => blank(state));
  // A half-typed new habit survives a stray scrim tap for a few minutes.
  const kept = useRef<{ draft: Draft; at: number } | null>(null);

  const openAdd = useCallback(() => {
    const k = kept.current;
    setEditing(null);
    setDraft(k && Date.now() - k.at < DRAFT_MS ? k.draft : blank(state));
    kept.current = null;
    setOpen(true);
  }, [state]);
  const openEdit = useCallback((h: Habit) => { setEditing(h); setDraft(fromHabit(state, h)); setOpen(true); }, [state]);
  const close = (saved: boolean) => {
    if (!editing && !saved && draft.name.trim()) kept.current = { draft, at: Date.now() };
    setOpen(false);
  };

  return (
    <AddHabitContext.Provider value={{ openAdd, openEdit }}>
      {children}
      <AddHabitSheet visible={open} onClose={close} draft={draft} setDraft={setDraft} editing={editing} />
    </AddHabitContext.Provider>
  );
}

function AddHabitSheet({ visible, onClose, draft: s, setDraft, editing }: {
  visible: boolean; onClose: (saved: boolean) => void; draft: Draft; setDraft: (fn: (d: Draft) => Draft) => void; editing: Habit | null;
}) {
  const p = usePalette();
  const toast = useToast();
  const { addHabit, updateHabit, archiveHabit, restoreHabit } = useStore();
  const a = accentFor(s.color, p);
  const set = (patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch }));
  const [timeOpen, setTimeOpen] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);

  const n = Math.floor((s.end - s.start) / s.iv) + 1;
  const dayN = s.days.filter(Boolean).length;
  const canSave = s.name.trim().length > 0 && (s.freq !== 'day' || dayN > 0);
  const nameLen = s.name.length;

  const onName = (name: string) => setDraft(d => ({ ...d, name, icon: d.iconPicked ? d.icon : guessIcon(name) ?? d.icon }));
  const pickIcon = (icon: IconName) => { set({ icon, iconPicked: true }); setIconsOpen(false); };

  const save = () => {
    const schedule: Schedule = s.freq === 'day' ? { kind: 'day', days: s.days }
      : s.freq === 'week' ? { kind: 'week', perWeek: s.per }
        : { kind: 'thru', intervalHours: s.iv, startHour: s.start, endHour: s.end };
    const h = {
      name: s.name.trim(), color: s.color, icon: s.icon, schedule,
      reminder: s.freq === 'thru' || !s.remindOn ? null : s.reminder,
      unit: s.freq === 'thru' ? s.unit.trim() || 'times' : undefined,
    };
    if (editing) updateHabit(editing.id, h);
    else addHabit(h);
    onClose(true);
  };

  const archive = async () => {
    if (!editing) return;
    if (!(await confirm(`Archive ${editing.name}?`, 'It leaves Today but keeps its history. You can bring it back from You → Archived.', 'Archive', 'Keep it', true))) return;
    const id = editing.id;
    archiveHabit(id);
    onClose(true);
    if (router.canGoBack()) router.back();
    toast.show({ text: `${editing.name} is archived.`, action: 'Undo', onAction: () => restoreHabit(id), mood: 'sleepy' });
  };

  const daysSummary = dayN === 7 ? 'Every day' : dayN === 0 ? 'No days yet' : dayN === 5 && s.days.slice(0, 5).every(Boolean) ? 'Weekdays'
    : s.days.map((on, i) => (on ? DAY_SHORT[i] : '')).filter(Boolean).join(', ');

  const option = (id: Freq, icon: IconName, label: string, summary: string, body: ReactNode) => {
    const on = s.freq === id;
    return (
      <Animated.View layout={LinearTransition.duration(240).easing(springEaseFn)} style={{ paddingBottom: 3 }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, borderRadius: 18, backgroundColor: on ? GREEN.edge : p.line }} />
        <View style={{ borderRadius: 18, backgroundColor: p.surface, borderWidth: 2, borderColor: on ? GREEN.primary : p.line, overflow: 'hidden' }}>
          <Pressable onPress={() => set({ freq: id })} accessibilityRole="radio" accessibilityState={{ selected: on }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 52, paddingVertical: 6 }}>
            <Icon n={icon} c={on ? p.headline : p.secondary} s={22} c2={p.surface} />
            <View style={{ flex: 1 }}>
              <Txt size={16} w={on ? 800 : 600} color={on ? p.ink : p.secondary}>{label}</Txt>
              {on ? <Txt size={13} w={700} color={p.secondary} numberOfLines={1}>{summary}</Txt> : null}
            </View>
            {on ? (
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: GREEN.primary, alignItems: 'center', justifyContent: 'center' }}><Icon n="check" c="#fff" s={16} /></View>
            ) : <View style={{ width: 22, height: 22, borderRadius: 13, borderWidth: 2, borderColor: p.handle }} />}
          </Pressable>
          {on ? <Animated.View entering={FadeIn.duration(200)}>{body}</Animated.View> : null}
        </View>
      </Animated.View>
    );
  };

  const remTime = s.remindOn ? clockLabel(s.reminder) : 'Off';
  const nudgeTime = (d: number) => set({ remindOn: true, reminder: (s.reminder + d + 24 * 60) % (24 * 60) });

  return (
    <Sheet
      visible={visible}
      onClose={() => onClose(false)}
      height={700}
      above={<View style={{ alignItems: 'flex-end', paddingRight: 43, marginBottom: -48 }}><Pip mood="expectant" size={100} shadow={false} /></View>}
      overEdge={<>
        <View pointerEvents="none" style={{ position: 'absolute', right: 107, top: 64, width: 24, height: 17, borderRadius: 12, backgroundColor: '#EBD9BB' }} />
        <View pointerEvents="none" style={{ position: 'absolute', right: 49, top: 64, width: 24, height: 17, borderRadius: 12, backgroundColor: '#EBD9BB' }} />
      </>}
    >
      <View style={{ backgroundColor: a.tint, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 16, gap: 10 }}>
        <Handle />
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 32 }}>
          <Pressable onPress={() => onClose(false)} hitSlop={10} accessibilityRole="button" style={{ minWidth: 64 }}>
            <Txt size={15} w={800} color={p.secondary}>Cancel</Txt>
          </Pressable>
          <Txt size={13} w={900} ls={1} color={p.label} align="center" style={{ flex: 1 }} accessibilityRole="header">{editing ? 'EDIT HABIT' : 'NEW HABIT'}</Txt>
          <View style={{ minWidth: 64 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View>
            <Ledge edge={a.edge} depth={3} radius={28} onPress={() => setIconsOpen(o => !o)} accessibilityLabel="Change icon"
              style={{ width: 56, height: 56, backgroundColor: a.base, alignItems: 'center', justifyContent: 'center' }}>
              <Icon n={s.icon} c="#FFFFFF" c2={a.base} s={30} />
            </Ledge>
            <View pointerEvents="none" style={{ position: 'absolute', right: -4, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: p.surface, borderWidth: 2, borderColor: a.tint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon n="pencil" c={a.ink} s={12} />
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <TextInput
              value={s.name} onChangeText={t => onName(t.replace(/\n/g, ''))} placeholder="Name your habit" placeholderTextColor={p.hint}
              autoFocus={!editing} returnKeyType="done" submitBehavior="blurAndSubmit" multiline maxLength={MAX_NAME} selectionColor={a.base} cursorColor={a.base}
              accessibilityLabel="Habit name"
              style={[{ fontFamily: FONT[900], fontSize: nameLen > 18 ? 22 : 28, lineHeight: nameLen > 18 ? 26 : 32, maxHeight: 56, letterSpacing: -0.5, color: p.ink, padding: 0 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
            />
            {nameLen >= 24 ? <Txt size={12} w={800} color={nameLen >= MAX_NAME ? '#D9533F' : p.hint} style={{ marginTop: 2 }}>{`${nameLen}/${MAX_NAME}`}</Txt> : null}
          </View>
        </View>
        {iconsOpen ? (
          <Animated.View entering={FadeIn.duration(180)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 10, borderRadius: 20, backgroundColor: p.surface }}>
            {HABIT_ICONS.map(k => {
              const on = k === s.icon;
              return (
                <Pressable key={k} onPress={() => pickIcon(k)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={k}
                  style={{ width: '14.5%', aspectRatio: 1, minWidth: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? a.base : a.tint }}>
                  <Icon n={k} c={on ? '#FFFFFF' : a.ink} c2={on ? a.base : a.tint} s={22} />
                </Pressable>
              );
            })}
          </Animated.View>
        ) : null}
      </View>
      <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 8, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {SWATCH_ORDER.map(k => {
            const on = k === s.color, c = ACCENTS[k];
            return (
              <Pressable key={k} onPress={() => set({ color: k })} hitSlop={4} accessibilityLabel={c.name} accessibilityRole="radio" accessibilityState={{ selected: on }}
                style={{ width: 36, height: 40, alignItems: 'center' }}>
                {on ? (
                  <View style={{ width: 40, height: 40, margin: -2, borderRadius: 20, borderWidth: 2.5, borderColor: c.base, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.base }} />
                  </View>
                ) : (
                  <View style={{ paddingBottom: 3 }}>
                    <View style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, borderRadius: 18, backgroundColor: c.edge }} />
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.base }} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
        <Txt size={20} w={800} ls={-0.2} style={{ marginTop: 2 }}>How often?</Txt>
        <View style={{ gap: 10 }}>
          {option('day', 'calendar', 'On certain days', daysSummary, (
            <View style={{ paddingTop: 2, paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
              <DayToggles days={s.days} base={a.base} edge={a.edge} onText={onAccent(s.color)}
                onToggle={i => setDraft(d => { const days = [...d.days]; days[i] = !days[i]; return { ...d, days }; })} />
              <Txt size={13} w={dayN === 0 ? 800 : 400} color={dayN === 0 ? '#D9533F' : p.secondary} align="center">{dayN === 7 ? 'Rest days are yours to pick.' : dayN === 0 ? 'Pick at least one day.' : `${dayN} day${dayN > 1 ? 's' : ''} a week. The others are rest days.`}</Txt>
            </View>
          ))}
          {option('week', 'repeat', 'A few times a week', `${s.per} time${s.per > 1 ? 's' : ''} a week`, (
            <View style={{ paddingTop: 2, paddingHorizontal: 14, paddingBottom: 14, alignItems: 'center', gap: 8 }}>
              <Stepper value={s.per} min={1} max={6} minWidth={150} label={`${s.per} time${s.per > 1 ? 's' : ''} a week`}
                onDown={() => set({ per: Math.max(1, s.per - 1) })} onUp={() => set({ per: Math.min(6, s.per + 1) })} />
              <Txt size={13} w={400} color={p.secondary}>Any days you like. Your streak counts in weeks.</Txt>
            </View>
          ))}
          {option('thru', 'clock', 'Throughout the day', `${n} ${s.unit.trim() || 'times'}, ${hourLabel(s.start)} – ${hourLabel(s.end)}`, (
            <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 10 }}>
              <Timeline n={n} base={a.base} tint={a.tint} end={18} mid={10} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Stepper size={32} minWidth={46} value={s.start} min={5} max={s.end - s.iv} label={hourLabel(s.start)}
                  onDown={() => set({ start: s.start - 1 })} onUp={() => set({ start: s.start + 1 })} />
                <Stepper size={32} minWidth={46} value={s.end} min={s.start + s.iv} max={24} label={hourLabel(s.end)}
                  onDown={() => set({ end: s.end - 1 })} onUp={() => set({ end: s.end + 1 })} />
              </View>
              <View style={{ alignItems: 'center', marginTop: 2 }}>
                <Stepper value={s.iv} min={1} max={Math.min(4, s.end - s.start)} label={`Every ${s.iv} hour${s.iv > 1 ? 's' : ''}`}
                  onDown={() => set({ iv: Math.max(1, s.iv - 1) })} onUp={() => set({ iv: Math.min(4, s.iv + 1) })} />
              </View>
              <Txt size={13} w={400} color={p.secondary} align="center">{`${n} reminders a day`}</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Txt size={13} w={800} color={p.label}>Counting</Txt>
                {UNITS.map(u => (
                  <Chip key={u} label={u} on={s.unit === u} onPress={() => set({ unit: u })} />
                ))}
                <TextInput value={UNITS.includes(s.unit) ? '' : s.unit} onChangeText={t => set({ unit: t.slice(0, 14) })} placeholder="other…" placeholderTextColor={p.hint}
                  accessibilityLabel="Custom unit" autoCapitalize="none"
                  style={[{ minWidth: 70, height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1.5, borderColor: p.line, fontFamily: FONT[700], fontSize: 14, color: p.ink }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]} />
              </View>
            </View>
          ))}
        </View>
        {s.freq !== 'thru' ? (
          <View style={{ paddingBottom: 3 }}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, borderRadius: 18, backgroundColor: p.line }} />
            <View style={{ borderRadius: 18, backgroundColor: p.bg, overflow: 'hidden' }}>
              <Pressable onPress={() => setTimeOpen(o => !o)} accessibilityRole="button" accessibilityLabel={`Reminder, ${remTime}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 52 }}>
                <Icon n="bell" c={p.secondary} s={20} />
                <Txt size={16} w={700} style={{ flex: 1 }}>Reminder</Txt>
                <Txt size={15} w={800} color={s.remindOn ? p.headline : p.secondary}>{remTime}</Txt>
                <Icon n={timeOpen ? 'chevD' : 'chevR'} c={p.tertiary} s={18} />
              </Pressable>
              {timeOpen ? (
                <Animated.View entering={FadeIn.duration(200)} style={{ paddingBottom: 14, paddingHorizontal: 14, alignItems: 'center', gap: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Chip label="Off" on={!s.remindOn} onPress={() => set({ remindOn: false })} />
                    {PRESETS.map(([label, t]) => (
                      <Chip key={label} label={label} on={s.remindOn && s.reminder === t} onPress={() => set({ remindOn: true, reminder: t })} />
                    ))}
                  </View>
                  <Stepper value={1} min={0} max={2} minWidth={120} label={s.remindOn ? clockLabel(s.reminder) : 'Pick a time'}
                    onDown={() => nudgeTime(-15)} onUp={() => nudgeTime(15)} />
                </Animated.View>
              ) : null}
            </View>
          </View>
        ) : null}
        <Button label={editing ? 'Save changes' : 'Add habit'} onPress={save} disabled={!canSave} style={{ marginTop: 10 }} />
        {editing ? (
          <Pressable onPress={archive} accessibilityRole="button" style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12 }}>
            <Icon n="lock" c="#D9533F" s={18} />
            <Txt size={15} w={800} color="#D9533F">Archive habit</Txt>
          </Pressable>
        ) : null}
      </View>
    </Sheet>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} hitSlop={4}
      style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? GREEN.primary : p.fill }}>
      <Txt size={14} w={800} color={on ? '#1F2A24' : p.secondary}>{label}</Txt>
    </Pressable>
  );
}

/** Reminder dots across the day: big dots at each end (with a tint halo), small ones between. */
export function Timeline({ n, base, tint, end, mid, halo = 3 }: { n: number; base: string; tint: string; end: number; mid: number; halo?: number }) {
  const H = end + halo * 2;
  return (
    <View style={{ height: H, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ position: 'absolute', left: H / 2, right: H / 2, top: H / 2 - 1, height: 2, borderRadius: 1, backgroundColor: tint }} />
      {Array.from({ length: n }, (_, i) => {
        const big = i === 0 || i === n - 1;
        if (!big) return <View key={i} style={{ width: mid, height: mid, borderRadius: mid / 2, backgroundColor: base }} />;
        return (
          <View key={i} style={{ width: H, height: H, borderRadius: H / 2, backgroundColor: halo ? tint : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: end, height: end, borderRadius: end / 2, backgroundColor: base }} />
          </View>
        );
      })}
    </View>
  );
}
