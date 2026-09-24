import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { Button } from '@/components/Button';
import { DayToggles, Stepper } from '@/components/Controls';
import { HABIT_ICONS, Icon, type IconName } from '@/components/Icon';
import { Ledge } from '@/components/Ledge';
import { Pip } from '@/components/Pip';
import { Handle, Sheet } from '@/components/Sheet';
import { Txt, FONT } from '@/components/Txt';
import { ACCENTS, accentFor, GREEN, SWATCH_ORDER, type AccentId } from '@/theme/colors';
import { springEaseFn } from '@/theme/motion';
import { usePalette } from '@/theme/ThemeProvider';
import { clockLabel, hourLabel } from '@/state/dates';
import { useStore } from '@/state/store';
import { guessIcon } from '@/state/templates';
import type { Habit, Schedule } from '@/state/types';

type Freq = Schedule['kind'];
type Draft = { name: string; color: AccentId; icon: IconName; iconPicked: boolean; freq: Freq; days: boolean[]; per: number; iv: number; reminder: number; remindOn: boolean };

const blank = (): Draft => ({ name: '', color: 'sky', icon: 'sprout', iconPicked: false, freq: 'day', days: Array(7).fill(true), per: 4, iv: 2, reminder: 21 * 60, remindOn: true });

function fromHabit(h: Habit): Draft {
  const d = blank();
  const sch = h.schedule;
  return {
    ...d, name: h.name, color: h.color, icon: h.icon, iconPicked: true, freq: sch.kind,
    days: sch.kind === 'day' ? [...sch.days] : d.days, per: sch.kind === 'week' ? sch.perWeek : d.per,
    iv: sch.kind === 'thru' ? sch.intervalHours : d.iv, reminder: h.reminder ?? d.reminder, remindOn: h.reminder != null,
  };
}

type Ctx = { openAdd: () => void; openEdit: (h: Habit) => void };
const AddHabitContext = createContext<Ctx>({ openAdd: () => {}, openEdit: () => {} });
export const useAddHabit = () => useContext(AddHabitContext);

export function AddHabitProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const openAdd = useCallback(() => { setEditing(null); setDraft(blank()); setOpen(true); }, []);
  const openEdit = useCallback((h: Habit) => { setEditing(h); setDraft(fromHabit(h)); setOpen(true); }, []);
  return (
    <AddHabitContext.Provider value={{ openAdd, openEdit }}>
      {children}
      <AddHabitSheet visible={open} onClose={() => setOpen(false)} draft={draft} setDraft={setDraft} editing={editing} />
    </AddHabitContext.Provider>
  );
}

const START = 8, END = 22;

function AddHabitSheet({ visible, onClose, draft: s, setDraft, editing }: {
  visible: boolean; onClose: () => void; draft: Draft; setDraft: (fn: (d: Draft) => Draft) => void; editing: Habit | null;
}) {
  const p = usePalette();
  const { addHabit, updateHabit } = useStore();
  const a = accentFor(s.color, p);
  const set = (patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch }));
  const [timeOpen, setTimeOpen] = useState(false);

  const n = Math.floor((END - START) / s.iv) + 1;
  const dayN = s.days.filter(Boolean).length;
  const canSave = s.name.trim().length > 0 && (s.freq !== 'day' || dayN > 0);

  const onName = (name: string) => setDraft(d => ({ ...d, name, icon: d.iconPicked ? d.icon : guessIcon(name) ?? 'sprout' }));
  const cycleIcon = () => setDraft(d => ({ ...d, iconPicked: true, icon: HABIT_ICONS[(HABIT_ICONS.indexOf(d.icon) + 1) % HABIT_ICONS.length] }));

  const save = () => {
    const schedule: Schedule = s.freq === 'day' ? { kind: 'day', days: s.days }
      : s.freq === 'week' ? { kind: 'week', perWeek: s.per }
        : { kind: 'thru', intervalHours: s.iv, startHour: START, endHour: END };
    const h = {
      name: s.name.trim(), color: s.color, icon: s.icon, schedule,
      reminder: s.freq === 'thru' || !s.remindOn ? null : s.reminder,
      unit: s.freq === 'thru' ? (editing?.unit ?? (s.icon === 'drop' ? 'glasses' : 'times')) : undefined,
    };
    if (editing) updateHabit(editing.id, h);
    else addHabit(h);
    onClose();
  };

  const option = (id: Freq, icon: IconName, label: string, body: ReactNode) => {
    const on = s.freq === id;
    return (
      <Animated.View layout={LinearTransition.duration(240).easing(springEaseFn)} style={{ paddingBottom: 3 }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, borderRadius: 18, backgroundColor: on ? GREEN.edge : p.line }} />
        <View style={{ borderRadius: 18, backgroundColor: p.surface, borderWidth: 2, borderColor: on ? GREEN.primary : p.line, overflow: 'hidden' }}>
          <Pressable onPress={() => set({ freq: id })} accessibilityRole="radio" accessibilityState={{ selected: on }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, height: 50 }}>
            <Icon n={icon} c={on ? p.headline : p.secondary} s={22} c2={p.surface} />
            <Txt size={16} w={on ? 800 : 600} color={on ? p.ink : p.secondary} style={{ flex: 1 }}>{label}</Txt>
            {on ? (
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: GREEN.primary, alignItems: 'center', justifyContent: 'center' }}><Icon n="check" c="#fff" s={16} /></View>
            ) : <View style={{ width: 22, height: 22, borderRadius: 13, borderWidth: 2, borderColor: p.handle }} />}
          </Pressable>
          {on ? <Animated.View entering={FadeIn.duration(200)}>{body}</Animated.View> : null}
        </View>
      </Animated.View>
    );
  };

  const remTime = s.freq === 'thru' ? `From ${clockLabel(START * 60)}` : s.remindOn ? clockLabel(s.reminder) : 'Off';

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      above={<View style={{ alignItems: 'flex-end', paddingRight: 43, marginBottom: -48 }}><Pip mood="expectant" size={100} shadow={false} /></View>}
      overEdge={<>
        <View pointerEvents="none" style={{ position: 'absolute', right: 107, top: 64, width: 24, height: 17, borderRadius: 12, backgroundColor: '#EBD9BB' }} />
        <View pointerEvents="none" style={{ position: 'absolute', right: 49, top: 64, width: 24, height: 17, borderRadius: 12, backgroundColor: '#EBD9BB' }} />
      </>}
    >
      <View style={{ backgroundColor: a.tint, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 18, gap: 14 }}>
        <Handle />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Ledge edge={a.edge} depth={3} radius={28} onPress={cycleIcon} accessibilityLabel="Change icon"
            style={{ width: 56, height: 56, backgroundColor: a.base, alignItems: 'center', justifyContent: 'center' }}>
            <Icon n={s.icon} c="#FFFFFF" c2={a.base} s={30} />
          </Ledge>
          <TextInput
            value={s.name} onChangeText={onName} placeholder="Name your habit" placeholderTextColor={p.tertiary}
            autoFocus={!editing} returnKeyType="done" maxLength={28} selectionColor={a.base} cursorColor={a.base}
            style={{ flex: 1, minWidth: 0, fontFamily: FONT[900], fontSize: 28, letterSpacing: -0.5, color: p.ink, padding: 0 , outlineWidth: 0 }}
          />
        </View>
      </View>
      <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 8, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {SWATCH_ORDER.map(k => {
            const on = k === s.color, c = ACCENTS[k];
            return (
              <Pressable key={k} onPress={() => set({ color: k })} accessibilityLabel={c.name} accessibilityRole="radio" accessibilityState={{ selected: on }}
                style={{ width: 34, height: 37, alignItems: 'center' }}>
                {on ? (
                  <View style={{ width: 39, height: 39, margin: -2.5, borderRadius: 20, borderWidth: 2.5, borderColor: c.base, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 29, height: 29, borderRadius: 15, backgroundColor: c.base }} />
                  </View>
                ) : (
                  <View style={{ paddingBottom: 3 }}>
                    <View style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, borderRadius: 17, backgroundColor: c.edge }} />
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.base }} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
        <Txt size={20} w={800} ls={-0.2} style={{ marginTop: 2 }}>How often?</Txt>
        <View style={{ gap: 10 }}>
          {option('day', 'calendar', 'Every day', (
            <View style={{ paddingTop: 2, paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
              <DayToggles days={s.days} base={a.base} edge={a.edge} onText={s.color === 'sunflower' ? '#1F2A24' : '#FFFFFF'}
                onToggle={i => setDraft(d => { const days = [...d.days]; days[i] = !days[i]; return { ...d, days }; })} />
              <Txt size={13} w={400} color={p.secondary} align="center">{dayN === 7 ? 'Every day. Rest days are yours to pick.' : dayN === 0 ? 'Pick at least one day.' : `${dayN} day${dayN > 1 ? 's' : ''} a week`}</Txt>
            </View>
          ))}
          {option('week', 'repeat', 'A few times a week', (
            <View style={{ paddingTop: 2, paddingHorizontal: 14, paddingBottom: 14, alignItems: 'center', gap: 8 }}>
              <Stepper value={s.per} min={1} max={6} minWidth={150} label={`${s.per} time${s.per > 1 ? 's' : ''} a week`}
                onDown={() => set({ per: Math.max(1, s.per - 1) })} onUp={() => set({ per: Math.min(6, s.per + 1) })} />
              <Txt size={13} w={400} color={p.secondary}>Any days you like. Your streak counts in weeks.</Txt>
            </View>
          ))}
          {option('thru', 'clock', 'Throughout the day', (
            <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}>
              <Timeline n={n} base={a.base} tint={a.tint} end={18} mid={10} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt size={12} w={700} color={p.secondary}>{hourLabel(START)}</Txt>
                <Txt size={12} w={700} color={p.secondary}>{hourLabel(END)}</Txt>
              </View>
              <View style={{ alignItems: 'center', marginTop: 2 }}>
                <Stepper value={s.iv} min={1} max={4} label={`Every ${s.iv} hour${s.iv > 1 ? 's' : ''}`}
                  onDown={() => set({ iv: Math.max(1, s.iv - 1) })} onUp={() => set({ iv: Math.min(4, s.iv + 1) })} />
              </View>
              <Txt size={13} w={400} color={p.secondary} align="center">{`${n} reminders a day`}</Txt>
            </View>
          ))}
        </View>
        <View style={{ paddingBottom: 3 }}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, borderRadius: 18, backgroundColor: p.line }} />
          <View style={{ borderRadius: 18, backgroundColor: p.bg, overflow: 'hidden' }}>
            <Pressable disabled={s.freq === 'thru'} onPress={() => setTimeOpen(o => !o)} accessibilityRole="button" accessibilityLabel={`Reminder, ${remTime}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 52 }}>
              <Icon n="bell" c={p.secondary} s={20} />
              <Txt size={16} w={700} style={{ flex: 1 }}>Reminder</Txt>
              <Txt size={15} w={800} color={p.headline}>{remTime}</Txt>
              <Icon n={timeOpen && s.freq !== 'thru' ? 'chevD' : 'chevR'} c={p.tertiary} s={18} />
            </Pressable>
            {timeOpen && s.freq !== 'thru' ? (
              <Animated.View entering={FadeIn.duration(200)} style={{ paddingBottom: 14, alignItems: 'center', gap: 10 }}>
                <Stepper value={s.reminder} min={0} max={24 * 60 - 30} minWidth={120} label={clockLabel(s.reminder)}
                  onDown={() => set({ remindOn: true, reminder: Math.max(0, s.reminder - 30) })}
                  onUp={() => set({ remindOn: true, reminder: Math.min(24 * 60 - 30, s.reminder + 30) })} />
                <Pressable onPress={() => set({ remindOn: !s.remindOn })} hitSlop={8}>
                  <Txt size={13} w={800} color={p.secondary}>{s.remindOn ? 'Turn reminder off' : 'Turn reminder on'}</Txt>
                </Pressable>
              </Animated.View>
            ) : null}
          </View>
        </View>
        <Button label={editing ? 'Save changes' : 'Add habit'} onPress={save} disabled={!canSave} style={{ marginTop: 10 }} />
      </View>
    </Sheet>
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
