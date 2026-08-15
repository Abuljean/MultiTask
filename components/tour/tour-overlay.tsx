// The tour overlay (v3 — developer script 2026-08-11). Mounted at the ROOT
// layout so it paints above every route, including the quick-add sheet the
// tour walks into.
//
// Step kinds:
//   action + dim  — everything is dimmed AND BLOCKED except a hole over the
//                   ringed target (root is box-none, the four dim panes eat
//                   touches, the hole has no view so touches fall through).
//   action        — ring + card only, whole app usable (in-form guidance).
//   spotlight     — dim + hole + Next.
//
// THE FREEZE FIX (developer report: "after I create a task it freezes"):
// navigation is pathname-aware. The overlay only switches tabs when the app
// is actually ON a tab — never while a modal route (quick-add) is open and
// mid-close, which previously double-popped the stack and wedged the UI.
import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type LayoutRectangle } from 'react-native';

import { useTour } from '@/components/tour/tour-context';
import { onTourEvent } from '@/lib/tour/events';
import { TOUR_STEPS } from '@/lib/tour/steps';
import { useTheme } from '@/lib/theme/use-theme';

const PAD = 8;
const DIM_SPOTLIGHT = 'rgba(0,0,0,0.72)';
const DIM_ACTION = 'rgba(0,0,0,0.55)';
const SEEN_KEY = 'tour.seen';
const TAB_PATHS = ['/', '/daily', '/calendar', '/settings'];

export function TourOverlay() {
  const { active, stop, measureAnchor, anchorVersion } = useTour();
  const { colors, space, radius, type, monoFont } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { height: windowHeight } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<LayoutRectangle | null>(null);
  const step = TOUR_STEPS[index];

  const finish = useCallback(() => {
    stop();
    setIndex(0);
    setRect(null);
    void AsyncStorage.setItem(SEEN_KEY, 'true');
  }, [stop]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0) return;
      if (nextIndex >= TOUR_STEPS.length) {
        finish();
        return;
      }
      setRect(null);
      setIndex(nextIndex);
    },
    [finish]
  );

  useEffect(() => {
    if (active) {
      setIndex(0);
      setRect(null);
    }
  }, [active]);

  // Tab placement — only ever navigate FROM a tab (see freeze fix above).
  useEffect(() => {
    if (!active || !step?.tab) return;
    if (pathname !== step.tab && TAB_PATHS.includes(pathname)) {
      router.navigate(step.tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index, pathname]);

  // Route-based advancing ("tap + " -> quick-add opened).
  useEffect(() => {
    if (!active || !step?.advanceOnPath) return;
    if (pathname === step.advanceOnPath) goTo(index + 1);
  }, [active, step, pathname, index, goTo]);

  // Measure the step's anchor with retries (sheets/tabs mount over frames).
  useEffect(() => {
    if (!active || !step) return;
    if (!step.anchor) {
      setRect(null);
      return;
    }
    let cancelled = false;
    let tries = 0;
    const attempt = async () => {
      // Let sheet/tab entrance animations settle first — measuring
      // mid-slide ringed the wrong region (v3 verification catch).
      await new Promise((r) => setTimeout(r, 350));
      while (!cancelled && tries < 20) {
        tries += 1;
        const measured = await measureAnchor(step.anchor as string);
        if (cancelled) return;
        if (measured) {
          setRect(measured);
          return;
        }
        await new Promise((r) => setTimeout(r, 250));
      }
    };
    void attempt();
    return () => {
      cancelled = true;
    };
    // anchorVersion: retry when a late mount registers the anchor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index, anchorVersion]);

  // Event-based advancing (the user actually did the thing).
  useEffect(() => {
    if (!active || !step?.advanceOn) return;
    return onTourEvent((event) => {
      if (event === step.advanceOn) goTo(index + 1);
    });
  }, [active, step, index, goTo]);

  if (!active || !step) return null;

  const isAction = step.kind === 'action';
  const counter = `${index + 1} / ${TOUR_STEPS.length}`;
  const body = Platform.OS === 'web' ? (step.webBody ?? step.body) : step.body;

  const card = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.borderSubtle,
          borderRadius: radius.card,
          padding: space.s4,
          gap: space.s2,
        },
      ]}>
      <Text style={{ fontFamily: monoFont, fontSize: 11, color: colors.textTertiary }}>{counter}</Text>
      <Text style={[type.h2, { color: colors.textPrimary }]}>{step.title}</Text>
      <Text style={[type.body, { color: colors.textSecondary }]}>{body}</Text>
      <View style={styles.buttonRow}>
        <Pressable onPress={finish} hitSlop={8} accessibilityRole="button">
          <Text style={[type.body, { color: colors.textTertiary }]}>Skip</Text>
        </Pressable>
        <View style={styles.rightButtons}>
          {index > 0 && (
            <Pressable
              onPress={() => goTo(index - 1)}
              hitSlop={8}
              accessibilityRole="button"
              style={[styles.navButton, { borderColor: colors.borderSubtle, borderRadius: radius.button }]}>
              <Text style={[type.body, { color: colors.textSecondary, fontWeight: '600' }]}>Back</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => goTo(index + 1)}
            hitSlop={8}
            accessibilityRole="button"
            style={[styles.navButton, { backgroundColor: colors.accent, borderRadius: radius.button }]}>
            <Text style={[type.body, { color: colors.textOnAccent, fontWeight: '600' }]}>
              {index === TOUR_STEPS.length - 1 ? 'Done' : 'Next'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  const ring = rect ? (
    <View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          left: rect.x - PAD,
          top: rect.y - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          borderColor: colors.accent,
          borderRadius: radius.card,
        },
      ]}
    />
  ) : null;

  // Four panes around the hole. The root stays box-none, so the hole (no
  // view there) passes touches to the app — the target stays interactive.
  const panes = (dimColor: string) =>
    rect ? (
      <>
        <View style={[styles.dim, { backgroundColor: dimColor, left: 0, right: 0, top: 0, height: Math.max(0, rect.y - PAD) }]} />
        <View style={[styles.dim, { backgroundColor: dimColor, left: 0, right: 0, top: rect.y + rect.height + PAD, bottom: 0 }]} />
        <View style={[styles.dim, { backgroundColor: dimColor, left: 0, width: Math.max(0, rect.x - PAD), top: rect.y - PAD, height: rect.height + PAD * 2 }]} />
        <View style={[styles.dim, { backgroundColor: dimColor, left: rect.x + rect.width + PAD, right: 0, top: rect.y - PAD, height: rect.height + PAD * 2 }]} />
      </>
    ) : null;

  // Card sits OPPOSITE the ringed element so it never covers what it's
  // pointing at (step.placement is the fallback when nothing is ringed).
  const placeTop = rect
    ? rect.y + rect.height / 2 > windowHeight / 2
    : step.placement === 'top';
  const holder = (
    <View
      pointerEvents="box-none"
      style={[styles.cardHolder, placeTop ? styles.holderTop : styles.holderBottom]}>
      {card}
    </View>
  );

  if (isAction) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.overlayRoot]} pointerEvents="box-none">
        {step.dim ? panes(DIM_ACTION) : null}
        {ring}
        {holder}
      </View>
    );
  }

  // Spotlight: dimmed and blocked everywhere except the hole.
  return (
    <View style={[StyleSheet.absoluteFill, styles.overlayRoot]} pointerEvents="box-none">
      {rect ? (
        <>
          {panes(DIM_SPOTLIGHT)}
          {ring}
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.dim, { backgroundColor: DIM_SPOTLIGHT }]} />
      )}
      {holder}
    </View>
  );
}

const styles = StyleSheet.create({
  // Above every route (the tour walks into the quick-add sheet).
  overlayRoot: { zIndex: 10000, elevation: 10000 },
  dim: { position: 'absolute' },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  card: {
    borderWidth: 1,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  cardHolder: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  holderTop: { top: 64 },
  holderBottom: { bottom: 96 },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rightButtons: { flexDirection: 'row', gap: 10 },
  navButton: {
    minHeight: 40,
    minWidth: 76,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
