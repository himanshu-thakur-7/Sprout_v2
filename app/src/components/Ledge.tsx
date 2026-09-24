import { useEffect, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { springEase } from '@/theme/motion';

// The Sprout signature: every card and button sits on a solid ledge in its
// darker shade (box-shadow 0 4px 0 [edge], zero blur). When pressed, the face
// moves down by the edge height and the edge goes to 0.

type Props = {
  edge: string;
  /** Ledge height in px. Accent elements use 4, neutral containers 3. */
  depth?: number;
  radius: number;
  style?: StyleProp<ViewStyle>;
  /** Outer (layout) style: margins, flex, alignSelf. */
  outerStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** Force the pressed look (storyboards). */
  pressed?: boolean;
  /** Flat, dashed "resting" elements have no ledge and don't press. */
  flat?: boolean;
  duration?: number;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'checkbox' | 'tab' | 'none';
  accessibilityState?: { checked?: boolean; selected?: boolean; disabled?: boolean };
  children?: ReactNode;
};

export function Ledge({
  edge, depth = 4, radius, style, outerStyle, onPress, onLongPress, disabled, pressed, flat, duration = 140,
  accessibilityLabel, accessibilityRole = 'button', accessibilityState, children,
}: Props) {
  const d = flat ? 0 : depth;
  const down = useSharedValue(pressed ? 1 : 0);
  useEffect(() => { down.set(withTiming(pressed ? 1 : 0, { duration })); }, [pressed, down, duration]);

  const face = useAnimatedStyle(() => ({ transform: [{ translateY: down.value * d }] }));
  const ledge = useAnimatedStyle(() => ({ opacity: down.value > 0.98 ? 0 : 1 }));

  const press = (v: 0 | 1) => {
    if (disabled || flat || pressed) return;
    down.set(withTiming(v, v ? { duration } : { duration, easing: springEase }));
  };

  const interactive = !!(onPress || onLongPress) && !disabled;

  return (
    <Pressable
      onPress={interactive ? onPress : undefined}
      onLongPress={interactive ? onLongPress : undefined}
      onPressIn={interactive ? () => press(1) : undefined}
      onPressOut={interactive ? () => press(0) : undefined}
      disabled={!interactive}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={interactive ? accessibilityRole : undefined}
      accessibilityState={accessibilityState}
      style={[{ paddingBottom: d }, outerStyle]}
    >
      {d > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', left: 0, right: 0, top: d, bottom: 0, borderRadius: radius, backgroundColor: edge }, ledge]}
        />
      ) : null}
      <Animated.View style={[{ borderRadius: radius }, style, face]}>{children}</Animated.View>
    </Pressable>
  );
}

/** A static neutral container: white card on a 3px #ECE4D6 ledge. */
export function Card({ edge, depth = 3, radius = 24, style, outerStyle, children, bg }: {
  edge: string; depth?: number; radius?: number; bg: string; style?: StyleProp<ViewStyle>; outerStyle?: StyleProp<ViewStyle>; children?: ReactNode;
}) {
  return (
    <View style={[{ paddingBottom: depth }, outerStyle]}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: depth, bottom: 0, borderRadius: radius, backgroundColor: edge }} />
      <View style={[{ borderRadius: radius, backgroundColor: bg }, style]}>{children}</View>
    </View>
  );
}
