import { Easing } from 'react-native-reanimated';

/** cubic-bezier(.34, 1.56, .64, 1): overshoots slightly, then settles. Used everywhere. */
export const springEase = Easing.bezier(0.34, 1.56, 0.64, 1);

/** The same curve as a plain function, for layout-animation builders and Keyframes. */
export const springEaseFn = Easing.bezierFn(0.34, 1.56, 0.64, 1);

/** Confetti flight curve. */
export const burstEase = Easing.bezier(0.15, 0.8, 0.3, 1);
