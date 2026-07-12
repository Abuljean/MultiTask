// WEB/DESKTOP variant of the swipe engine (docs/design/08): hover replaces
// swipe. Hovering the LEFT edge of a row slides it right, revealing the
// complete/restore action; hovering the RIGHT edge slides it left,
// revealing delete. CLICKING the revealed edge commits the action — same
// semantics, undo toasts, and trail visuals as the touch version. Entrance
// and cascade-exit animations match the tuned native values.
import { useEffect, useState, type ComponentProps, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/lib/theme/use-theme';

const REVEAL_PX = 88; // how far the row slides aside on hover
const ENTER_DURATION_MS = 647.2; // FINAL tuned value (docs/design/05)

type IconName = ComponentProps<typeof IconSymbol>['name'];

export type SwipeAction = {
  color: string;
  icon: IconName;
};

type Props = PropsWithChildren<{
  rightAction: SwipeAction;
  leftAction: SwipeAction;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  resetKey: string | number;
  enterFrom?: 'left' | 'right' | null;
  onEntered?: () => void;
  exit?: { to: 'left' | 'right'; delayMs: number } | null;
}>;

export function SwipeableRow({
  rightAction,
  leftAction,
  onSwipeRight,
  onSwipeLeft,
  resetKey,
  enterFrom,
  onEntered,
  exit,
  children,
}: Props) {
  const { colors, radius } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const [hoverSide, setHoverSide] = useState<'left' | 'right' | null>(null);

  // Hover slides the row aside; leaving slides it back.
  useEffect(() => {
    const target = hoverSide === 'left' ? REVEAL_PX : hoverSide === 'right' ? -REVEAL_PX : 0;
    translateX.value = withTiming(target, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [hoverSide, translateX]);

  // Reset when the row's logical state changes.
  useEffect(() => {
    translateX.value = 0;
    setHoverSide(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Entrance: same glide-in-and-stop as native.
  useEffect(() => {
    if (enterFrom) {
      translateX.value = (enterFrom === 'left' ? -1 : 1) * screenWidth * 0.6;
      translateX.value = withTiming(0, { duration: ENTER_DURATION_MS, easing: Easing.out(Easing.cubic) });
      onEntered?.();
    }
  }, [enterFrom, screenWidth, translateX, onEntered]);

  // Programmatic exit (bulk clear cascade).
  useEffect(() => {
    if (exit) {
      translateX.value = withDelay(
        exit.delayMs,
        withTiming((exit.to === 'left' ? -1 : 1) * screenWidth, {
          duration: 240,
          easing: Easing.out(Easing.cubic),
        })
      );
    }
  }, [exit, screenWidth, translateX]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const rightTrailStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 4 ? 1 : 0,
  }));
  const leftTrailStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -4 ? 1 : 0,
  }));

  function commit(side: 'left' | 'right') {
    setHoverSide(null);
    // Slide off in the action's direction, then fire — mirrors the swipe.
    const direction = side === 'left' ? 1 : -1;
    translateX.value = withTiming(
      direction * screenWidth,
      { duration: 240, easing: Easing.out(Easing.cubic) },
      () => {}
    );
    if (side === 'left') onSwipeRight();
    else onSwipeLeft();
  }

  return (
    <View>
      <Animated.View
        style={[styles.trail, { backgroundColor: rightAction.color, borderRadius: radius.card }, rightTrailStyle]}>
        <View style={styles.trailIconLeft}>
          <IconSymbol name={rightAction.icon} size={22} color={colors.textOnAccent} />
        </View>
      </Animated.View>
      <Animated.View
        style={[styles.trail, { backgroundColor: leftAction.color, borderRadius: radius.card }, leftTrailStyle]}>
        <View style={styles.trailIconRight}>
          <IconSymbol name={leftAction.icon} size={22} color={colors.textOnAccent} />
        </View>
      </Animated.View>

      <Animated.View style={contentStyle}>{children}</Animated.View>

      {/* Invisible hover/click zones on the row's edges. */}
      <Pressable
        style={[styles.edgeZone, styles.edgeLeft]}
        onHoverIn={() => setHoverSide('left')}
        onHoverOut={() => setHoverSide(null)}
        onPress={() => commit('left')}
        accessibilityLabel="Complete or restore"
      />
      <Pressable
        style={[styles.edgeZone, styles.edgeRight]}
        onHoverIn={() => setHoverSide('right')}
        onHoverOut={() => setHoverSide(null)}
        onPress={() => commit('right')}
        accessibilityLabel="Delete"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  trail: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  trailIconLeft: {
    position: 'absolute',
    left: 24,
  },
  trailIconRight: {
    position: 'absolute',
    right: 24,
  },
  edgeZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 56,
    zIndex: 10,
  },
  edgeLeft: { left: 0 },
  edgeRight: { right: 0 },
});
