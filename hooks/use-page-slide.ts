// Shared page-travel motion for day-to-day and week-to-week navigation.
// Two entry points (developer directions 2026-08-02):
//   go(delta, apply)      — buttons/chevrons: full automatic page swipe.
//   panGesture(onCommit)  — the INTERACTIVE swipe: content follows the
//                           finger (iOS-homescreen feel); releasing past
//                           ~40% of the screen or with a flick commits to
//                           the next page, anything less springs back.
// In both, content exits fully off-screen and the next page enters from the
// opposite edge — no fade. The data swap happens at the midpoint on a TIMER,
// so a janked frame shortens the motion instead of blocking navigation.
// Reduced motion swaps instantly (rule 5).
import { useWindowDimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { isReduceMotionEnabled } from '@/lib/reduced-motion';

export function usePageSlide() {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  /** Continue from wherever the content currently sits (0 for buttons, the
   *  finger's position for gestures) off-screen, swap, enter from the other
   *  edge. dir: +1 = forward (content exits left). */
  function travel(dir: number, apply: () => void) {
    if (isReduceMotionEnabled()) {
      x.value = 0;
      apply();
      return;
    }
    const remaining = Math.abs(-dir * width - x.value);
    const outMs = Math.max(60, Math.min(140, (remaining / width) * 140));
    x.value = withTiming(-dir * width, { duration: outMs, easing: Easing.out(Easing.cubic) });
    setTimeout(() => {
      apply();
      x.value = dir * width;
      x.value = withTiming(0, { duration: 210, easing: Easing.out(Easing.cubic) });
    }, outMs + 5);
  }

  /** Button/chevron navigation — one full page swipe per call. */
  function go(delta: number, apply: () => void) {
    if (delta === 0) return;
    travel(Math.sign(delta), apply);
  }

  /** The interactive swipe. onCommit(dir) applies the state change for one
   *  page in `dir` — the hook drives all motion. */
  function panGesture(onCommit: (dir: 1 | -1) => void) {
    const commit = (dir: 1 | -1) => travel(dir, () => onCommit(dir));
    return Gesture.Pan()
      .activeOffsetX([-16, 16])
      .failOffsetY([-12, 12])
      .onUpdate((event) => {
        // Content rides the finger 1:1.
        x.value = event.translationX;
      })
      .onEnd((event) => {
        const dir: 1 | -1 = event.translationX < 0 ? 1 : -1;
        const past = Math.abs(event.translationX) > width * 0.4;
        const flick = Math.abs(event.velocityX) > 800 && Math.abs(event.translationX) > 30;
        if (past || flick) {
          runOnJS(commit)(dir);
        } else {
          x.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
        }
      });
  }

  return { style, go, panGesture };
}
