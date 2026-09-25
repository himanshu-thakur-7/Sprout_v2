import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { springEaseFn } from '@/theme/motion';
import { usePalette } from '@/theme/ThemeProvider';
import { Pip, type PipMood } from './Pip';
import { Txt } from './Txt';

// A small snackbar in Pip's voice: undo after unchecking, first check-ins,
// streak milestones and "I couldn't save that". One at a time; newest wins.

type ToastOpts = { text: string; action?: string; onAction?: () => void; mood?: PipMood; ms?: number };
type Ctx = { show: (t: ToastOpts) => void; hide: () => void };

const ToastContext = createContext<Ctx>({ show: () => {}, hide: () => {} });
export const useToast = () => useContext(ToastContext);

/** Offset from the bottom edge so the toast clears the tab bar and FAB. */
const ABOVE_TABS = 118;

export function ToastProvider({ children }: { children: ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<(ToastOpts & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hide = useCallback(() => { clearTimeout(timer.current); setToast(null); }, []);
  const show = useCallback((t: ToastOpts) => {
    clearTimeout(timer.current);
    const id = Date.now();
    setToast({ ...t, id });
    timer.current = setTimeout(() => setToast(cur => (cur?.id === id ? null : cur)), t.ms ?? 4000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      {toast ? (
        <Animated.View key={toast.id} entering={FadeInDown.duration(260).easing(springEaseFn)} exiting={FadeOutDown.duration(180)}
          pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + ABOVE_TABS }}>
          <View accessibilityLiveRegion="polite" accessibilityRole="alert"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingLeft: 8, paddingRight: toast.action ? 6 : 16, borderRadius: 20, backgroundColor: p.dark ? '#F2EEE6' : '#1F2A24' }}>
            <View style={{ width: 34, height: 40, overflow: 'hidden', alignItems: 'center' }}>
              <Pip mood={toast.mood ?? 'happy'} size={34} shadow={false} alive={false} />
            </View>
            <Txt size={15} w={700} color={p.dark ? '#1F2A24' : '#FBF7F0'} style={{ flex: 1, paddingVertical: 12 }}>{toast.text}</Txt>
            {toast.action ? (
              <Pressable onPress={() => { toast.onAction?.(); hide(); }} hitSlop={8} accessibilityRole="button"
                style={{ paddingHorizontal: 14, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: p.dark ? '#E3DCCF' : '#33403A' }}>
                <Txt size={15} w={900} color={p.dark ? '#1F2A24' : '#9BE3B2'}>{toast.action}</Txt>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}
