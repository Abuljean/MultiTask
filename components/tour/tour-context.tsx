// Tour plumbing (v4): anchors register live MEASURE FUNCTIONS (the overlay
// measures on demand), and WRAPPER anchors draw the highlight ring
// THEMSELVES when their step is active — the ring is part of the scrolled
// content, so it tracks scrolling and keyboard shifts natively with zero
// lag (developer feedback 2026-08-14: the measured ring "lags up and down
// after the box"). Ref-based anchors (FAB, top bars — non-scrolling) keep
// the overlay-drawn ring. Step index also lives here: several overlay
// instances (tabs / quick-add / day) share it.
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutRectangle, type StyleProp, type ViewStyle } from 'react-native';

import { TOUR_STEPS } from '@/lib/tour/steps';

type Rect = LayoutRectangle;
type MeasureFn = () => Promise<Rect | null>;
type AnchorEntry = { measure: MeasureFn; selfRing: boolean };

type TourContextValue = {
  active: boolean;
  start: () => void;
  stop: () => void;
  index: number;
  setIndex: (index: number) => void;
  /** The active step's anchor id (null when idle) — wrapper anchors use it
   *  to draw their own ring. */
  activeAnchor: string | null;
  registerAnchor: (id: string, entry: AnchorEntry) => () => void;
  /** Rect + whether the anchor draws its own ring. */
  measureAnchor: (id: string) => Promise<{ rect: Rect; selfRing: boolean } | null>;
  anchorVersion: number;
  /** Accent color for the self-drawn ring (avoids theme deps here). */
  ringColor: string;
  setRingColor: (color: string) => void;
};

const TourContext = createContext<TourContextValue | null>(null);

function measureView(ref: React.RefObject<View | null>): Promise<Rect | null> {
  return new Promise((resolve) => {
    const node = ref.current;
    if (!node) return resolve(null);
    node.measureInWindow((x, y, width, height) => {
      resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
    });
  });
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [ringColor, setRingColor] = useState('#7C86E8');
  const anchors = useRef(new Map<string, AnchorEntry>());
  const [anchorVersion, setAnchorVersion] = useState(0);

  const registerAnchor = useCallback((id: string, entry: AnchorEntry) => {
    anchors.current.set(id, entry);
    setAnchorVersion((v) => v + 1);
    return () => {
      if (anchors.current.get(id) === entry) anchors.current.delete(id);
    };
  }, []);
  const measureAnchor = useCallback(async (id: string) => {
    const entry = anchors.current.get(id);
    if (!entry) return null;
    const rect = await entry.measure();
    return rect ? { rect, selfRing: entry.selfRing } : null;
  }, []);
  const start = useCallback(() => {
    setIndex(0);
    setActive(true);
  }, []);
  const stop = useCallback(() => {
    setActive(false);
    setIndex(0);
  }, []);

  const activeAnchor = active ? (TOUR_STEPS[index]?.anchor ?? null) : null;

  const value = useMemo(
    () => ({
      active,
      start,
      stop,
      index,
      setIndex,
      activeAnchor,
      registerAnchor,
      measureAnchor,
      anchorVersion,
      ringColor,
      setRingColor,
    }),
    [active, start, stop, index, activeAnchor, registerAnchor, measureAnchor, anchorVersion, ringColor]
  );
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour outside TourProvider');
  return ctx;
}

/** Ref+onLayout pair for anchoring elements a wrapper View would break
 *  (absolutely-positioned ones like the FAB). Overlay draws the ring for
 *  these. Safe outside a TourProvider — becomes a no-op. */
export function useTourAnchor(id: string): {
  ref: React.RefObject<View | null>;
  onLayout: () => void;
} {
  const ctx = useContext(TourContext);
  const ref = useRef<View>(null);
  const registered = useRef(false);
  const onLayout = useCallback(() => {
    if (!ctx || registered.current) return;
    registered.current = true;
    ctx.registerAnchor(id, { measure: () => measureView(ref), selfRing: false });
  }, [ctx, id]);
  return { ref, onLayout };
}

const RING_PAD = 6;

/** Wrap any element to make it spotlightable. Draws its own ring when its
 *  step is active — the ring scrolls WITH the content. */
export function TourAnchor({
  id,
  children,
  style,
}: {
  id: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { registerAnchor, activeAnchor, ringColor } = useTour();
  const ref = useRef<View>(null);
  useEffect(
    () => registerAnchor(id, { measure: () => measureView(ref), selfRing: true }),
    [id, registerAnchor]
  );
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
      {activeAnchor === id && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              margin: -RING_PAD,
              borderWidth: 2,
              borderColor: ringColor,
              borderRadius: 14,
            },
          ]}
        />
      )}
    </View>
  );
}
