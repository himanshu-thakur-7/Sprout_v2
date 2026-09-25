import { useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { Card } from '@/components/Ledge';
import { Handle, Sheet } from '@/components/Sheet';
import { FONT, Txt } from '@/components/Txt';
import { Segmented } from '@/components/Controls';
import { accentFor, ACCENTS, GOLD, GREEN, type AccentId } from '@/theme/colors';
import { usePalette } from '@/theme/ThemeProvider';
import type { ThemePref } from '@/theme/ThemeProvider';
import { monthName, parseDay } from '@/state/dates';
import { bestStreak, isArchived, isWeekly, liveHabits, perfectDayCount, SHIELD_EVERY, shieldInfo } from '@/state/logic';
import { askForReminders, remindersSupported } from '@/state/reminders';
import { useStore } from '@/state/store';
import { confirm } from '@/utils/confirm';

const THEMES: [ThemePref, string][] = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']];

/** 16 You — three proud numbers, shields, a few settings, archived habits and a clearly separated way to start over. */
export default function You() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { state, today, setSettings, restoreHabit, reset } = useStore();
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

  const [denied, setDenied] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const archived = state.habits.filter(h => isArchived(h, today));

  const toggleReminders = async () => {
    if (state.settings.reminders) return setSettings({ reminders: false });
    if (!remindersSupported) return;
    const ok = await askForReminders();
    setSettings({ reminders: ok, notificationsAsked: true });
    setDenied(!ok);
  };
  const remindersSub = !remindersSupported
    ? (Platform.OS === 'web' ? 'Reminders live in the phone app' : 'Needs a development build, not Expo Go')
    : denied ? 'Off · allow notifications in Settings' : state.settings.reminders ? 'A gentle nudge when a habit is due' : 'Off';

  const startOver = async () => {
    if (await confirm('Start over?', 'This clears every habit and streak on this phone. It can’t be undone.', 'Start over', 'Keep everything', true)) reset();
  };

  const stat = (icon: IconName, c: string, v: string, l: string, ink: string) => (
    <Card edge={p.line} bg={p.surface} radius={22} outerStyle={{ flex: 1 }} style={{ flex: 1, paddingTop: 16, paddingHorizontal: 6, paddingBottom: 14, alignItems: 'center', gap: 2 }}>
      <Icon n={icon} c={c} s={20} c2={p.surface} />
      <Txt size={40} w={900} ls={-1.4} lh={1.05} color={ink} numberOfLines={1} adjustsFontSizeToFit>{v}</Txt>
      <Txt size={12} w={700} color={p.secondary} align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{l}</Txt>
    </Card>
  );
  const row = (icon: IconName, accent: AccentId, label: string, sub: string | null, right: ReactNode, onPress?: () => void, last = false) => {
    const a = accentFor(accent, p);
    return (
      <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel={sub ? `${label}, ${sub}` : label}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58, paddingVertical: 8, borderBottomWidth: last ? 0 : 1.5, borderBottomColor: p.divider }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: a.tint, alignItems: 'center', justifyContent: 'center' }}><Icon n={icon} c={a.ink} s={18} c2={a.tint} /></View>
        <View style={{ flex: 1 }}>
          <Txt size={16} w={700}>{label}</Txt>
          {sub ? <Txt size={13} w={400} color={p.secondary} numberOfLines={2}>{sub}</Txt> : null}
        </View>
        {right}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 130 }}>
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
          {stat('flame', GOLD.base, longest.n ? `${longest.n}${longest.weeks ? 'w' : 'd'}` : '0', longest.n ? `${longest.name} · best` : 'best streak', p.dark ? GOLD.base : GOLD.ink)}
          {stat('shield', ACCENTS.lavender.base, String(shields.ready), shields.ready === 1 ? 'shield ready' : 'shields ready', lav.ink)}
        </View>

        <View style={{ marginTop: 14, marginHorizontal: 20, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: lav.tint, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityLabel={`${shields.ready} shields ready. Next one in ${shields.nextIn} perfect days.`}>
            {Array.from({ length: Math.min(shields.ready, 6) }, (_, i) => <Icon key={i} n="shield" c={ACCENTS.lavender.base} c2={lav.tint} s={22} />)}
            <View style={{ opacity: 0.4 }}><Icon n="shield" c={ACCENTS.lavender.edge} c2={lav.tint} s={22} /></View>
            <Txt size={13} w={800} color={lav.ink}>{`${SHIELD_EVERY - shields.nextIn}/${SHIELD_EVERY}`}</Txt>
          </View>
          <Txt size={13} w={700} lh={1.4} color={lav.ink}>
            {`Shields repair a streak you missed yesterday. Earn one every ${SHIELD_EVERY} perfect days.`}
          </Txt>
        </View>

        <Txt size={12} w={800} ls={0.5} color={p.label} style={{ paddingTop: 22, paddingHorizontal: 20, paddingBottom: 8 }}>SETTINGS</Txt>
        <Card edge={p.line} bg={p.surface} outerStyle={{ marginHorizontal: 20 }} style={{ paddingHorizontal: 16 }}>
          {row('bell', 'sunflower', 'Reminders', remindersSub,
            <Toggle on={state.settings.reminders && remindersSupported} disabled={!remindersSupported} onPress={toggleReminders} label="Reminders" />,
            remindersSupported ? toggleReminders : undefined)}
          <View style={{ paddingVertical: 10, gap: 10, borderBottomWidth: 1.5, borderBottomColor: p.divider }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: accentFor('sky', p).tint, alignItems: 'center', justifyContent: 'center' }}><Icon n="sun" c={accentFor('sky', p).ink} s={18} /></View>
              <Txt size={16} w={700} style={{ flex: 1 }}>Theme</Txt>
            </View>
            <Segmented options={THEMES} value={state.settings.theme} onChange={v => setSettings({ theme: v })} width="100%" />
          </View>
          {row('person', 'leaf', 'Account', 'On this phone', <Icon n="chevR" c={p.tertiary} s={18} />, openAccount, !archived.length)}
          {archived.length ? row('lock', 'lavender', `Archived (${archived.length})`, null, <Icon n={showArchived ? 'chevD' : 'chevR'} c={p.tertiary} s={18} />, () => setShowArchived(v => !v), !showArchived) : null}
          {showArchived ? archived.map((h, i) => {
            const a = accentFor(h.color, p);
            return (
              <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingLeft: 8, borderBottomWidth: i < archived.length - 1 ? 1 : 0, borderBottomColor: p.divider }}>
                <Icon n={h.icon} c={a.base} s={20} />
                <Txt size={15} w={700} numberOfLines={1} style={{ flex: 1 }}>{h.name}</Txt>
                <Pressable onPress={() => restoreHabit(h.id)} accessibilityRole="button" accessibilityLabel={`Restore ${h.name}`} hitSlop={6}
                  style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: p.fill, justifyContent: 'center' }}>
                  <Txt size={14} w={800} color={p.headline}>Restore</Txt>
                </Pressable>
              </View>
            );
          }) : null}
        </Card>

        <Txt size={12} w={800} ls={0.5} color={p.label} style={{ paddingTop: 22, paddingHorizontal: 20, paddingBottom: 8 }}>DANGER ZONE</Txt>
        <Pressable onPress={startOver} accessibilityRole="button" accessibilityHint="Clears every habit and streak on this phone"
          style={{ marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1.5, borderColor: '#F2B8AE' }}>
          <Icon n="close" c="#D9533F" s={18} />
          <Txt size={16} w={800} color="#D9533F" style={{ flex: 1 }}>Start over</Txt>
        </Pressable>
      </ScrollView>
      <AccountSheet key={accountKey} visible={account} onClose={() => setAccount(false)} />
    </View>
  );
}

/** A real on/off switch, 51×31 like the platform's. */
function Toggle({ on, onPress, disabled, label }: { on: boolean; onPress: () => void; disabled?: boolean; label: string }) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="switch" accessibilityState={{ checked: on, disabled }} accessibilityLabel={label} hitSlop={8}
      style={{ width: 51, height: 31, borderRadius: 16, padding: 2, backgroundColor: on ? GREEN.button : p.fill, opacity: disabled ? 0.5 : 1, alignItems: on ? 'flex-end' : 'flex-start' }}>
      <View style={{ width: 27, height: 27, borderRadius: 14, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }} />
    </Pressable>
  );
}

function AccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const p = usePalette();
  const { state, setName } = useStore();
  const [draft, setDraft] = useState(state.profile.name);
  return (
    <Sheet visible={visible} onClose={onClose} style={{ paddingTop: 10, paddingHorizontal: 20, gap: 14 }}>
      <Handle />
      <Txt size={24} w={800} ls={-0.3}>What should Pip call you?</Txt>
      <TextInput value={draft} onChangeText={setDraft} placeholder="Your name" placeholderTextColor={p.tertiary} maxLength={24} autoFocus
        style={[{ fontFamily: FONT[800], fontSize: 20, color: p.ink, backgroundColor: p.bg, borderRadius: 18, paddingHorizontal: 16, height: 52 }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]} />
      <Txt size={14} w={400} color={p.secondary} lh={1.4}>Accounts and sync are on the way. For now everything lives on this phone.</Txt>
      <Button label="Save" onPress={() => { setName(draft.trim()); onClose(); }} />
    </Sheet>
  );
}
