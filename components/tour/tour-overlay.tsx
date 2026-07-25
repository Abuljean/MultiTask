// The spotlight overlay: dims everything except a hole around the current
// step's anchor, with a card explaining it (Next / Skip). Four plain dim
// Views form the cutout — no SVG masks, no reanimated, nothing that can
// no-op on any platform. Tab switches happen between steps via the router.
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TOUR_STEPS } from '@/lib/tour/steps';
import { useTheme } from '@/lib/theme/use-theme';
import { useTour } from './tour-context';

const DIM = 'rgba(0,0,0,0.72)';
const PAD = 8; // breathing room around the highlighted element

export function TourOverlay() {
  const { active, stop, getAnchor } = useTour();
  const router = useRouter();
  const { colors, space, radius, type, monoFont } = useTheme();
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);

  const step = TOUR_STEPS[index];

  // Keep the router on the step's tab; anchors register as screens mount.
  useEffect(() => {
    if (!active || !step) return;
    router.navigate(step.tab);
  }, [active, index]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active) setIndex(0);
  }, [active]);

  if (!active || !step) return null;

  function finish() {
    stop();
    setIndex(0);
  }
  function next() {
    if (index + 1 >= TOUR_STEPS.length) finish();
    else setIndex(index + 1);
  }

  const rect = getAnchor(step.anchor);
  // Anchor not measured (yet, or feature hidden on this platform): show the
  // card centered without a spotlight rather than blocking the tour.
  const hole = rect
    ? {
        x: Math.max(0, rect.x - PAD),
        y: Math.max(0, rect.y - PAD),
        w: Math.min(winW, rect.width + PAD * 2),
        h: rect.height + PAD * 2,
      }
    : null;

  const cardTop = hole
    ? step.placement === 'above'
      ? undefined
      : hole.y + hole.h + 12
    : winH * 0.3;
  const cardBottom = hole && step.placement === 'above' ? winH - hole.y + 12 : undefined;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      {hole ? (
        <>
          <View style={[styles.dim, { top: 0, left: 0, right: 0, height: hole.y }]} />
          <View style={[styles.dim, { top: hole.y, left: 0, width: hole.x, height: hole.h }]} />
          <View style={[styles.dim, { top: hole.y, left: hole.x + hole.w, right: 0, height: hole.h }]} />
          <View style={[styles.dim, { top: hole.y + hole.h, left: 0, right: 0, bottom: 0 }]} />
          {/* Accent ring around the hole. */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: hole.y,
              left: hole.x,
              width: hole.w,
              height: hole.h,
              borderWidth: 2,
              borderColor: colors.accent,
              borderRadius: radius.button,
            }}
          />
        </>
      ) : (
        <View style={[styles.dim, StyleSheet.absoluteFill]} />
      )}

      <View
        style={{
          position: 'absolute',
          left: space.s4,
          right: space.s4,
          top: cardTop,
          bottom: cardBottom,
          alignItems: 'center',
        }}>
        <View
          style={{
            width: '100%',
            maxWidth: 480,
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.borderSubtle,
            borderWidth: 1,
            borderRadius: radius.card,
            padding: space.s4,
            gap: space.s2,
          }}>
          <Text style={{ fontFamily: monoFont, fontSize: 11, color: colors.textTertiary }}>
            {index + 1} / {TOUR_STEPS.length}
          </Text>
          <Text style={[type.h2, { color: colors.textPrimary }]}>{step.title}</Text>
          <Text style={[type.body, { color: colors.textSecondary }]}>{step.body}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.s2 }}>
            <Pressable onPress={finish} hitSlop={8} accessibilityRole="button">
              <Text style={[type.body, { color: colors.textTertiary }]}>Skip</Text>
            </Pressable>
            <Pressable
              onPress={next}
              accessibilityRole="button"
              style={({ pressed }) => ({
                backgroundColor: colors.accent,
                borderRadius: radius.button,
                paddingHorizontal: space.s5,
                minHeight: 40,
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}>
              <Text style={[type.body, { color: colors.textOnAccent, fontWeight: '600' }]}>
                {index + 1 >= TOUR_STEPS.length ? 'Done' : 'Next'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
});
