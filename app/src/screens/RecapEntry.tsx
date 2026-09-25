import { router } from 'expo-router';
import { View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Ledge } from '@/components/Ledge';
import { Txt } from '@/components/Txt';
import { GOLD } from '@/theme/colors';
import { usePalette } from '@/theme/ThemeProvider';
import { weekRange } from '@/state/dates';
import type { Recap } from '@/state/recap';

/** Gold-ledged card that opens the weekly recap. */
export function RecapEntry({ recap, title = 'Your week in Sprout' }: { recap: Recap; title?: string }) {
  const p = usePalette();
  return (
    <Ledge edge={p.dark ? p.line : GOLD.ledge} radius={24} onPress={() => router.push('/recap')} accessibilityLabel={`${title}, ${weekRange(recap.week)}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: p.dark ? p.surface : '#FFF6D9' }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.dark ? '#2E2915' : '#FFE58A', alignItems: 'center', justifyContent: 'center' }}>
        <Icon n="sparkle" c={p.dark ? GOLD.base : '#FFFFFF'} s={24} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={17} w={800} numberOfLines={1}>{title}</Txt>
        <Txt size={14} w={400} color={p.secondary} numberOfLines={1}>{`${weekRange(recap.week)} · ${recap.kept} of ${recap.total} habits kept`}</Txt>
      </View>
      <Icon n="chevR" c={p.tertiary} s={20} />
    </Ledge>
  );
}
