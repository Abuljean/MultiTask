// The tour overlay (v2 — developer feedback 2026-08-02): two step kinds.
// 'spotlight' dims the screen with a cutout ring over the live element and
// blocks touches. 'action' keeps the app FULLY usable — just a ring on the
// target and a small instruction card — and advances itself when the user
// actually performs the step (tour events), with Next as a fallback. Back
// works everywhere. Anchors are measured on demand with retries, so the
// ring lands on the element as it is NOW, not where it was at mount.
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pressable, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';

import { useTour } from '@/components/tour/tour-context';
import { onTourEvent } from '@/lib/tour/events';
import { TOUR_STEPS } from '@/lib/tour/steps';
import { useTheme } from '@/lib/theme/use-theme';

const PAD = 8;
const DIM = 'rgba(0,0,0,0.72)';
const SEEN_KEY = 'tour.seen';

export function TourOverlay() {
  const { active, stop, measureAnchor, anchorVersion } = useTour();
  const { colors, space, radius, type, monoFont } = useTheme();
  const router = useRouter();
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

  // Reset to the first step whenever a tour starts fresh.
  useEffect(() => {
    if (active) {
      setIndex(0);
      setRect(null);
    }
  }, [active]);

  // Each step: hop to its tab, then measure its anchor with retries (tabs
  // and their layouts need a few frames to mount and settle).
  useEffect(() => {
    if (!active || !step) return;
    router.navigate(step.tab);
    if (!step.anchor) {
      setRect(null);
      return;
    }
    let cancelled = false;
    let tries = 0;
    const attempt = async () => {
      while (!cancelled && tries < 16) {
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
    // anchorVersion: retry when a late tab mount registers the anchor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index, anchorVersion]);

  // Action steps advance when the user actually does the thing.
  useEffect(() => {
    if (!active || !step?.advanceOn) return;
    return onTourEvent((event) => {
      if (event === step.advanceOn) goTo(index + 1);
    });
  }, [active, step, index, goTo]);

  if (!active || !step) return null;

  const isAction = step.kind === 'action';
  const counter = `${index + 1} / ${TOUR_STEPS.length}`;

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
      <Text style={[type.body, { color: colors.textSecondary }]}>{step.body}</Text>
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

  if (isAction) {
    // App stays interactive: only the ring (touch-transparent) and the card
    // are on screen. The card sits where it won't cover the target.
    return (
      <View style={[StyleSheet.absoluteFill, styles.overlayRoot]} pointerEvents="box-none">
        {ring}
        <View
          pointerEvents="box-none"
          style={[
            styles.actionCardHolder,
            step.placement === 'above' ? styles.holderTop : styles.holderBottom,
          ]}>
          {card}
        </View>
      </View>
    );
  }

  // Spotlight: four dim panes around the cutout + ring + card.
  return (
    <View style={[StyleSheet.absoluteFill, styles.overlayRoot]}>
      {rect ? (
        <>
          <View style={[styles.dim, { left: 0, right: 0, top: 0, height: Math.max(0, rect.y - PAD) }]} />
          <View
            style={[
              styles.dim,
              { left: 0, right: 0, top: rect.y + rect.height + PAD, bottom: 0 },
            ]}
          />
          <View
            style={[
              styles.dim,
              { left: 0, width: Math.max(0, rect.x - PAD), top: rect.y - PAD, height: rect.height + PAD * 2 },
            ]}
          />
          <View
            style={[
              styles.dim,
              { left: rect.x + rect.width + PAD, right: 0, top: rect.y - PAD, height: rect.height + PAD * 2 },
            ]}
          />
          {ring}
        </>
      ) : (
        <View style={[styles.dim, StyleSheet.absoluteFill]} />
      )}
      <View
        pointerEvents="box-none"
        style={[
          styles.actionCardHolder,
          !rect || step.placement === 'below' ? styles.holderCenterLow : styles.holderTop,
        ]}>
        {card}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Navigation scenes create stacking contexts that can paint over a plain
  // sibling — pin the overlay above everything (the v1 "sun and moon never
  // highlighted" bug: cards existed in the DOM but painted underneath).
  overlayRoot: { zIndex: 10000, elevation: 10000 },
  dim: { position: 'absolute', backgroundColor: DIM },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  card: {
    borderWidth: 1,
    width: '100%',
    maxWidth: 420,
    // Legible over any screen without reanimated shadows.
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  actionCardHolder: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  holderTop: { top: 72 },
  holderBottom: { bottom: 96 },
  holderCenterLow: { top: '46%' },
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
