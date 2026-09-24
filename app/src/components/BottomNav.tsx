import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GREEN } from '@/theme/colors';
import { usePalette } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Ledge } from './Ledge';
import { Txt } from './Txt';

export type NavTab = 'today' | 'progress' | 'you';

const ITEMS: [NavTab, string, IconName][] = [['today', 'Today', 'home'], ['progress', 'Progress', 'chart'], ['you', 'You', 'person']];

/** Three tabs on the left, the green + floating 34pt above the bar on the right. */
export function BottomNav({ active, onNav, onFab }: { active: NavTab; onNav: (t: NavTab) => void; onFab?: () => void }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      backgroundColor: p.navBg, borderTopWidth: 1.5, borderTopColor: p.line, flexDirection: 'row', justifyContent: 'space-around',
      paddingTop: 10, paddingLeft: 16, paddingRight: 70, paddingBottom: Math.max(insets.bottom, 12), minHeight: 84,
    }}>
      {ITEMS.map(([id, label, icon]) => {
        const on = id === active;
        return (
          <Pressable key={id} onPress={() => onNav(id)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label}
            style={{ width: 72, alignItems: 'center', gap: 3 }} hitSlop={8}>
            <Icon n={icon} c={on ? GREEN.primary : p.navInactive} s={26} />
            <Txt size={12} w={800} color={on ? p.navActiveText : p.navInactiveText}>{label}</Txt>
          </Pressable>
        );
      })}
      {onFab ? (
        <Ledge edge={GREEN.edge} radius={30} onPress={onFab} accessibilityLabel="Add habit" outerStyle={{ position: 'absolute', right: 20, top: -34 }}
          style={{ width: 60, height: 60, backgroundColor: GREEN.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Icon n="plus" c="#FFFFFF" s={30} />
        </Ledge>
      ) : null}
    </View>
  );
}
