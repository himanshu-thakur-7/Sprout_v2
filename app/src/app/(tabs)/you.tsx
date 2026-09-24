import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { Card } from '@/components/Ledge';
import { Handle, Sheet } from '@/components/Sheet';
import { FONT, Txt } from '@/components/Txt';
import { accentFor, ACCENTS, GOLD, GREEN } from '@/theme/colors';
import { usePalette } from '@/theme/ThemeProvider';
import type { ThemePref } from '@/theme/ThemeProvider';
import { monthName, parseDay } from '@/state/dates';
import { bestStreak, isWeekly, liveHabits, perfectDayCount, shieldInfo } from '@/state/logic';
import { askForReminders, remindersSupported } from '@/state/reminders';
import { useStore } from '@/state/store';
import { confirm } from '@/utils/confirm';

const THEMES: [ThemePref, string][] = [['system', 'Match system'], ['light', 'Light'], ['dark', 'Dark']];

/** 16 You — three proud numbers, one line about shields, three settings. Nothing else. */
export default function You() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { state, today, setSettings } = useStore();
  const [account, setAccount] = useState(false);
  const [accountKey, setAccountKey] = useState(0);
  const openAccount = () => { setAccountKey(k => k + 1); setAccount(true); };

  const perfect = useMemo(() => perfectDayCount(state, today), [state, today]);
  const shields = shieldInfo(state, perfect);
  const longest = useMemo(() => {
    let best = { n: 0, name: '', weeks: false };
    for (const h of liveHabits(state, today)) {
      const n = bestStreak(state, h, today);
      if (n > best.n) best = { n, name: h.name, weeks: isWeekly(h) };
    }
    return best;
  }, [state, today]);

  const name = state.profile.name.trim();
  const since = state.profile.since ? parseDay(state.profile.since) : null;
  const lav = accentFor('lavender', p);

  const toggleReminders = async () => {
    if (state.settings.reminders) return setSettings({ reminders: false });
    if (!remindersSupported) {
      await confirm('Reminders need the full app', 'Expo Go on Android can’t schedule notifications. They work in a development build of Sprout.', 'OK', 'Close');
      return;
    }
    const ok = await askForReminders();
    setSettings({ reminders: true, notificationsAsked: true });
    if (!ok) await confirm('Reminders are off in Settings', 'Turn on notifications for Sprout in your phone’s Settings and I’ll nudge you right on time.', 'OK', 'Close');
  };
  const cycleTheme = () => {
    const i = THEMES.findIndex(([k]) => k === state.settings.theme);
    setSettings({ theme: THEMES[(i + 1) % THEMES.length][0] });
  };

  const rows: { icon: IconName; accent: keyof typeof ACCENTS; l: string; v: string; on: () => void }[] = [
    { icon: 'bell', accent: 'sunflower', l: 'Reminders', v: state.settings.reminders ? 'On' : 'Off', on: toggleReminders },
    { icon: 'sun', accent: 'sky', l: 'Theme', v: THEMES.find(([k]) => k === state.settings.theme)?.[1] ?? 'Match system', on: cycleTheme },
    { icon: 'person', accent: 'leaf', l: 'Account', v: 'On this phone', on: openAccount },
  ];

  const stat = (icon: IconName, c: string, v: string, l: string, ink: string) => (
    <Card edge={p.line} bg={p.surface} radius={22} outerStyle={{ flex: 1 }} style={{ flex: 1, paddingTop: 16, paddingHorizontal: 6, paddingBottom: 14, alignItems: 'center', gap: 2 }}>
      <Icon n={icon} c={c} s={20} c2={p.surface} />
      <Txt size={40} w={900} ls={-1.4} lh={1.05} color={ink} numberOfLines={1} adjustsFontSizeToFit>{v}</Txt>
      <Txt size={12} w={400} color={p.secondary} align="center">{l}</Txt>
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }}>
        <Pressable onPress={openAccount} style={{ alignItems: 'center', paddingTop: 22 }} accessibilityRole="button" accessibilityLabel="Edit your name">
          <View style={{ paddingBottom: 4 }}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 4, bottom: 0, borderRadius: 48, backgroundColor: GREEN.edge }} />
            <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: accentFor('leaf', p).tint, alignItems: 'center', justifyContent: 'center' }}>
              {name ? <Txt size={40} w={900} color={p.headline}>{name[0].toUpperCase()}</Txt> : <Icon n="sprout" c={GREEN.primary} s={44} />}
            </View>
          </View>
          <Txt size={28} w={900} ls={-0.6} style={{ marginTop: 14 }}>{name || 'You'}</Txt>
          <Txt size={14} w={400} color={p.secondary}>{since ? `Growing since ${monthName(since.getMonth())} ${since.getFullYear()}` : 'Just planted'}</Txt>
        </Pressable>

        <View style={{ marginTop: 24, marginHorizontal: 20, flexDirection: 'row', gap: 10 }}>
          {stat('sparkle', GOLD.base, String(perfect), 'perfect days', p.dark ? GOLD.base : GOLD.ink)}
          {stat('flame', GOLD.base, String(longest.n), longest.n ? `longest streak\n${longest.weeks ? 'weeks' : 'days'} · ${longest.name}` : 'longest streak', p.dark ? GOLD.base : GOLD.ink)}
          {stat('shield', ACCENTS.lavender.base, String(shields.ready), shields.ready === 1 ? 'shield ready' : 'shields ready', lav.ink)}
        </View>

        <View style={{ marginTop: 14, marginHorizontal: 20, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: lav.tint, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon n="shield" c={ACCENTS.lavender.edge} s={18} c2={lav.tint} />
          <Txt size={13} w={700} lh={1.4} color={p.dark ? ACCENTS.lavender.base : '#4E3A9E'} style={{ flex: 1 }}>
            {`Shields repair a streak you missed yesterday. Earn one every 14 perfect days${shields.nextIn < 14 ? ` · next in ${shields.nextIn}` : ''}.`}
          </Txt>
        </View>

        <Txt size={12} w={800} ls={0.5} color={p.label} style={{ paddingTop: 22, paddingHorizontal: 20, paddingBottom: 8 }}>SETTINGS</Txt>
        <Card edge={p.line} bg={p.surface} outerStyle={{ marginHorizontal: 20 }} style={{ paddingHorizontal: 16 }}>
          {rows.map((r, i) => {
            const a = accentFor(r.accent, p);
            return (
              <Pressable key={r.l} onPress={r.on} accessibilityRole="button" accessibilityLabel={`${r.l}, ${r.v}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: 58, borderBottomWidth: i < rows.length - 1 ? 1.5 : 0, borderBottomColor: p.divider }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: a.tint, alignItems: 'center', justifyContent: 'center' }}><Icon n={r.icon} c={r.accent === 'sunflower' ? ACCENTS.sunflower.edge : a.base} s={18} /></View>
                <Txt size={16} w={700} style={{ flex: 1 }}>{r.l}</Txt>
                <Txt size={14} w={400} color={p.secondary}>{r.v}</Txt>
                <Icon n="chevR" c={p.tertiary} s={18} />
              </Pressable>
            );
          })}
        </Card>
      </ScrollView>
      <AccountSheet key={accountKey} visible={account} onClose={() => setAccount(false)} />
    </View>
  );
}

function AccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const p = usePalette();
  const { state, setName, reset } = useStore();
  const [draft, setDraft] = useState(state.profile.name);
  const startOver = async () => {
    if (await confirm('Start over?', 'This clears every habit and streak on this phone. It can’t be undone.', 'Start over', 'Keep everything', true)) {
      onClose();
      reset();
    }
  };
  return (
    <Sheet visible={visible} onClose={onClose} style={{ paddingTop: 10, paddingHorizontal: 20, gap: 14 }}>
      <Handle />
      <Txt size={24} w={800} ls={-0.3}>What should Pip call you?</Txt>
      <TextInput value={draft} onChangeText={setDraft} placeholder="Your name" placeholderTextColor={p.tertiary} maxLength={24} autoFocus
        style={{ fontFamily: FONT[800], fontSize: 20, color: p.ink, backgroundColor: p.bg, borderRadius: 18, paddingHorizontal: 16, height: 52 , outlineWidth: 0 }} />
      <Txt size={14} w={400} color={p.secondary} lh={1.4}>Accounts and sync are on the way. For now everything lives on this phone.</Txt>
      <Button label="Save" onPress={() => { setName(draft.trim()); onClose(); }} />
      <Pressable onPress={startOver} style={{ alignSelf: 'center', paddingVertical: 8, marginBottom: 8 }} accessibilityRole="button">
        <Txt size={14} w={800} color={p.secondary}>Start over</Txt>
      </Pressable>
    </Sheet>
  );
}
