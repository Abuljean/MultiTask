import { Platform, useWindowDimensions } from 'react-native';

/** Below this, phone layout. Above it, the layouts designed for desktop web. */
export const WIDE_MIN_WIDTH = 900;

/**
 * True when the app should use its wide layouts: the two-pane day timeline,
 * the big named-bar calendar, the always-open search bar.
 *
 * Gated on WIDTH, never on device — iPadOS 26 makes every app resizable, so
 * one iPad hands us a 1366pt landscape canvas, a ~1024pt portrait one, and a
 * ~320pt Slide Over sliver over the app's lifetime. Reading the live width is
 * the only thing that stays correct through a window drag.
 *
 * Limited to web + iPad on purpose: those are the two surfaces whose wide
 * layouts have been verified. Android tablets keep the phone layout until the
 * Android polish phase gives them the same treatment (docs/design/08).
 */
export function useWideLayout() {
  const { width } = useWindowDimensions();
  const canGoWide = Platform.OS === 'web' || (Platform.OS === 'ios' && Platform.isPad);
  return canGoWide && width >= WIDE_MIN_WIDTH;
}

/**
 * Wide layout on a NATIVE tablet specifically. Bottom sheets use this to cap
 * their width: web already re-centres them as dialogs, but on iPad they stay
 * bottom-anchored (the slide-up animation and keyboard padding are built
 * around that) and would otherwise stretch into a 1366pt slab.
 */
export function useWideNative() {
  const wide = useWideLayout();
  return wide && Platform.OS !== 'web';
}
