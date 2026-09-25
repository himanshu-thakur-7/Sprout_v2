import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GREEN } from '@/theme/colors';
import { usePalette } from '@/theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Ledge } from './Ledge';
import { Txt } from './Txt';

export type NavTab = 'today' | 'progress' | 'you';

const ITEMS: [NavTab, string, IconName][] = [['today', 'Today', 'home'], ['progress', 'Progress', 'chart'], ['you', 'You', 'person']];

/** Three tabs and the green +, raised 34pt above the bar in its own slot. Hidden on You. */
export function BottomNav({ active, onNav, onFab }: { active: NavTab; onNav: (t: NavTab) => void; onFab?: () => void }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      backgroundColor: p.navBg, borderTopWidth: 1.5, borderTopColor: p.line, flexDirection: 'row',
      paddingTop: 10, paddingHorizontal: 8, paddingBottom: Math.max(insets.bottom, 12), minHeight: 84,
    }}>
      {ITEMS.map(([id, label, icon]) => {
        const on = id === active;
        return (
          <Pressable key={id} onPress={() => onNav(id)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label}
            style={{ flex: 1, alignItems: 'center', gap: 3, minHeight: 44 }} hitSlop={4}>
            <Icon n={icon} c={on ? GREEN.primary : p.navInactive} s={26} />
            <Txt size={12} w={800} color={on ? p.navActiveText : p.navInactiveText}>{label}</Txt>
          </Pressable>
        );
      })}
      {onFab ? (
        // The + is a raised fourth slot, so the tabs stay evenly spaced.
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Ledge edge={GREEN.buttonEdge} radius={30} onPress={onFab} accessibilityLabel="Add habit" outerStyle={{ marginTop: -34 }}
            style={{ width: 60, height: 60, backgroundColor: GREEN.button, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: p.navBg }}>
            <Icon n="plus" c="#FFFFFF" s={28} />
          </Ledge>
        </View>
      ) : null}
    </View>
  );
}
