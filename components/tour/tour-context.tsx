// Tour plumbing (v2): anchors register a live MEASURE FUNCTION, not a cached
// rect — the overlay measures the real element the moment its step shows (and
// retries while tabs mount), so highlights can't go stale after scrolls or
// tab switches (the v1 bug). Dependency-free — the spotlight is plain Views,
// so it can never fight the screens it sits over.
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, type LayoutRectangle } from 'react-native';

type Rect = LayoutRectangle;
type MeasureFn = () => Promise<Rect | null>;

type TourContextValue = {
  active: boolean;
  start: () => void;
  stop: () => void;
  registerAnchor: (id: string, measure: MeasureFn) => () => void;
  measureAnchor: (id: string) => Promise<Rect | null>;
  /** Bumps when anchors mount — lets the overlay retry a missing anchor. */
  anchorVersion: number;
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
  const anchors = useRef(new Map<string, MeasureFn>());
  const [anchorVersion, setAnchorVersion] = useState(0);

  const registerAnchor = useCallback((id: string, measure: MeasureFn) => {
    anchors.current.set(id, measure);
    setAnchorVersion((v) => v + 1);
    return () => {
      if (anchors.current.get(id) === measure) anchors.current.delete(id);
    };
  }, []);
  const measureAnchor = useCallback(async (id: string) => {
    const measure = anchors.current.get(id);
    return measure ? measure() : null;
  }, []);
  const start = useCallback(() => setActive(true), []);
  const stop = useCallback(() => setActive(false), []);

  const value = useMemo(
    () => ({ active, start, stop, registerAnchor, measureAnchor, anchorVersion }),
    [active, start, stop, registerAnchor, measureAnchor, anchorVersion]
  );
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour outside TourProvider');
  return ctx;
}

/** Ref+onLayout pair for anchoring elements a wrapper View would break
 *  (absolutely-positioned ones like the FAB). Registers a live measure
 *  function. Safe outside a TourProvider — becomes a no-op. */
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
    ctx.registerAnchor(id, () => measureView(ref));
  }, [ctx, id]);
  return { ref, onLayout };
}

/** Wrap any element to make it spotlightable. The overlay measures it in
 *  WINDOW coords right when its step shows. */
export function TourAnchor({ id, children }: { id: string; children: ReactNode }) {
  const { registerAnchor } = useTour();
  const ref = useRef<View>(null);
  useEffect(
    () => registerAnchor(id, () => measureView(ref)),
    [id, registerAnchor]
  );
  return (
    <View ref={ref} collapsable={false}>
      {children}
    </View>
  );
}
