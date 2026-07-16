// Synchronous access to the OS reduce-motion setting (docs/design/05 §Reduced
// motion + CLAUDE.md rule 5 — this is an accessibility HARD-LINE).
//
// Reanimated ≥3.5 honors the setting by itself (ReduceMotion.System is the
// default for withTiming/withSpring/entering/exiting), so the sheets, swipes,
// and toasts degrade automatically. The gap is imperative LayoutAnimation
// (animate-layout.ts) and any timing logic that ASSUMES an animation played —
// those check this module.
//
// Module-level subscription so call sites can ask synchronously (the value
// arrives async a few ms after import; defaulting to false until then is the
// correct failure direction — motion plays, then respects the setting).
import { AccessibilityInfo } from 'react-native';

let reduceMotion = false;

AccessibilityInfo.isReduceMotionEnabled()
  .then((value) => {
    reduceMotion = value;
  })
  .catch(() => {});

AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
  reduceMotion = value;
});

export function isReduceMotionEnabled(): boolean {
  return reduceMotion;
}
