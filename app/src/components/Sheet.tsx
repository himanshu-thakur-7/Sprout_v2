import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { springEase } from '@/theme/motion';
import { usePalette } from '@/theme/ThemeProvider';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Rendered above the sheet, anchored to its top edge (Pip peeking over). */
  above?: ReactNode;
  /** Drawn on top of the sheet's top edge (Pip's hands holding on). */
  overEdge?: ReactNode;
  scrim?: string;
  style?: StyleProp<ViewStyle>;
  /** Dismiss when the scrim is tapped. */
  dismissable?: boolean;
};

/** 32pt top radius, grey handle, ink scrim at 42%. Springs up in 380 ms while the scrim fades in over 200 ms. */
export function Sheet({ visible, onClose, children, above, overEdge, scrim, style, dismissable = true }: Props) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const y = useSharedValue(1);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      y.value = withTiming(0, { duration: 380, easing: springEase });
      fade.value = withTiming(1, { duration: 200 });
    } else if (mounted) {
      fade.value = withTiming(0, { duration: 200 });
      y.value = withTiming(1, { duration: 240 }, fin => { if (fin) runOnJS(setMounted)(false); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * 900 }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (!mounted) return null;
  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: scrim ?? p.scrim }, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissable ? onClose : undefined} accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View style={sheetStyle} pointerEvents="box-none">
          {above ? <View pointerEvents="none">{above}</View> : null}
          <View style={[{ backgroundColor: p.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', paddingBottom: Math.max(insets.bottom, 20) }, style]}>
            {children}
          </View>
          {overEdge}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Handle() {
  const p = usePalette();
  return <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: p.handle }} />;
}
