// Tour plumbing: anchors register their layout by id; the overlay reads
// them. Kept dependency-free (no reanimated) — the spotlight is plain Views,
// so it can never fight the screens it sits over.
import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { View, type LayoutRectangle } from 'react-native';

type Rect = LayoutRectangle;

type TourContextValue = {
  active: boolean;
  start: () => void;
  stop: () => void;
  registerAnchor: (id: string, rect: Rect) => void;
  getAnchor: (id: string) => Rect | null;
};

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const anchors = useRef(new Map<string, Rect>());
  // Bumping this after registrations lets the overlay re-read rects without
  // re-measuring on a timer.
  const [, setVersion] = useState(0);

  const registerAnchor = useCallback((id: string, rect: Rect) => {
    anchors.current.set(id, rect);
    setVersion((v) => v + 1);
  }, []);
  const getAnchor = useCallback((id: string) => anchors.current.get(id) ?? null, []);
  const start = useCallback(() => setActive(true), []);
  const stop = useCallback(() => setActive(false), []);

  const value = useMemo(
    () => ({ active, start, stop, registerAnchor, getAnchor }),
    [active, start, stop, registerAnchor, getAnchor]
  );
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour outside TourProvider');
  return ctx;
}

/** Ref+onLayout pair that registers ANY element (incl. absolutely-positioned
 *  ones like the FAB, where a wrapper View would break layout) as a tour
 *  anchor. Safe to call outside a TourProvider — becomes a no-op. */
export function useTourAnchor(id: string): {
  ref: React.RefObject<View | null>;
  onLayout: () => void;
} {
  const ctx = useContext(TourContext);
  const ref = useRef<View>(null);
  const onLayout = useCallback(() => {
    if (!ctx) return;
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) ctx.registerAnchor(id, { x, y, width, height });
    });
  }, [ctx, id]);
  return { ref, onLayout };
}

/** Wrap any element to make it spotlightable. Measures in WINDOW coords so
 *  the overlay (which fills the window) can cut a hole exactly over it. */
export function TourAnchor({ id, children }: { id: string; children: ReactNode }) {
  const { registerAnchor } = useTour();
  const ref = useRef<View>(null);
  return (
    <View
      ref={ref}
      collapsable={false}
      onLayout={() => {
        ref.current?.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) registerAnchor(id, { x, y, width, height });
        });
      }}>
      {children}
    </View>
  );
}
