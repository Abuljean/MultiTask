// Shared page-travel motion for day-to-day and week-to-week navigation
// (developer direction 2026-08-02: a real page swipe — content exits fully
// off-screen the way you are going and the next page enters from the other
// edge. No fade). The data swap happens at the midpoint on a TIMER, so a
// janked frame shortens the motion instead of blocking navigation. Reduced
// motion swaps instantly (rule 5).
import { useWindowDimensions } from 'react-native';
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { isReduceMotionEnabled } from '@/lib/reduced-motion';

export function usePageSlide() {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  /** Slide one page in `delta` direction, applying the state change at the
   *  midpoint. delta's sign is the travel direction (+1 = forward/left). */
  function go(delta: number, apply: () => void) {
    if (delta === 0) return;
    if (isReduceMotionEnabled()) {
      apply();
      return;
    }
    const dir = Math.sign(delta);
    x.value = withTiming(-dir * width, { duration: 140, easing: Easing.in(Easing.cubic) });
    setTimeout(() => {
      apply();
      x.value = dir * width;
      x.value = withTiming(0, { duration: 210, easing: Easing.out(Easing.cubic) });
    }, 145);
  }

  return { style, go };
}
