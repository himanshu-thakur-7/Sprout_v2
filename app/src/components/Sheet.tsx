import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { springEase } from '@/theme/motion';
import { usePalette } from '@/theme/ThemeProvider';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Rendered above the sheet, anchored to its top edge (Pip peeking over). Hidden when the screen is too short for it. */
  above?: ReactNode;
  /** Drawn on top of the sheet's top edge (Pip's hands holding on). Shown only with `above`. */
  overEdge?: ReactNode;
  scrim?: string;
  /** Style of the sheet's content (padding, alignment). */
  style?: StyleProp<ViewStyle>;
  /** Dismiss when the scrim is tapped. */
  dismissable?: boolean;
};

const CloseContext = createContext<() => void>(() => {});

/**
 * 32pt top radius, grey handle, ink scrim at 42%. Springs up in 380 ms while the scrim fades in over 200 ms.
 * The sheet never grows past the top safe area; taller content scrolls, and the handle closes it.
 */
export function Sheet({ visible, onClose, children, above, overEdge, scrim, style, dismissable = true }: Props) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const [sheetH, setSheetH] = useState(0);
  const [aboveH, setAboveH] = useState(0);
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
  // Leave a strip of scrim at the top so it's always clear how to get out.
  const maxH = winH - insets.top - 24;
  const showAbove = !!above && (sheetH === 0 || sheetH + aboveH <= maxH);

  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <CloseContext.Provider value={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: scrim ?? p.scrim }, scrimStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismissable ? onClose : undefined} accessibilityLabel="Close" />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
          <Animated.View style={sheetStyle} pointerEvents="box-none">
            {showAbove ? <View pointerEvents="none" onLayout={e => setAboveH(e.nativeEvent.layout.height)}>{above}</View> : null}
            <View onLayout={e => setSheetH(e.nativeEvent.layout.height)}
              style={{ maxHeight: maxH, backgroundColor: p.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }}>
              <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
                contentContainerStyle={[{ paddingBottom: Math.max(insets.bottom, 20) }, style]}>
                {children}
              </ScrollView>
            </View>
            {showAbove ? overEdge : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </CloseContext.Provider>
    </Modal>
  );
}

/** The grey grab handle. Tapping it closes the sheet. */
export function Handle() {
  const p = usePalette();
  const close = useContext(CloseContext);
  return (
    <Pressable onPress={close} hitSlop={{ top: 12, bottom: 12, left: 40, right: 40 }} accessibilityRole="button" accessibilityLabel="Close sheet"
      style={{ alignSelf: 'center', paddingVertical: 2 }}>
      <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: p.handle }} />
    </Pressable>
  );
}
