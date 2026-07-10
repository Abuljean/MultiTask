// Mail-style swipeable wrapper around TaskCard (docs/design/04).
// What a swipe MEANS depends on where the task is:
//   live task:      right = complete (green trail, check) · left = delete (red, trash)
//   completed task: right = restore  (accent trail, undo) · left = delete (red, trash)
//   trashed task:   right = restore  (accent trail, undo) · left = PERMANENT delete (red, trash)
// The screen decides what actually happens via onSwipeRight/onSwipeLeft; this
// component only owns the physics and the trail visuals.
// Threshold is 30% of screen width (toned down from 40% per developer
// feedback): below it the card springs back, crossing it ticks a haptic,
// releasing past it slides the card off (240ms ease-out) and fires.
// Reanimated animations respect the system reduce-motion setting by default.
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { TaskCard } from '@/components/task-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Task } from '@/lib/tasks/types';
import { useTheme } from '@/lib/theme/use-theme';

// Golden-ratio threshold (developer's pick): 16.18% of screen width.
const THRESHOLD_FRACTION = 0.1618;

// The trail only reveals once the card has actually moved — a resting or
// barely-wiggled card must never flash the action colors behind it.
const TRAIL_REVEAL_PX = 4;

// High damping: springs settle quickly with barely any sway (developer
// feedback — "it has to settle faster, there can't be too much swaying").
// Used for the snap-back when a swipe is released below the threshold.
const SETTLE_SPRING = { damping: 26, stiffness: 240 };

// Entrance spring (developer pick, final): the bounce overshoots the
// resting point by 16.18% of the travel distance (golden ratio of the
// 60%-width slide-in). Overshoot = exp(-πζ/√(1-ζ²)) ⇒ damping ratio
// ζ ≈ 0.50; with mass 1: damping = 2ζ√stiffness ⇒ 11 at stiffness 120.
const ENTER_SPRING = { damping: 11, stiffness: 120 };

type Props = {
  task: Task;
  onSwipeRight: (task: Task) => void;
  onSwipeLeft: (task: Task) => void;
  onPress?: (task: Task) => void;
  /** Set by the screen when this task just moved groups: the card slides in
   *  from that side. Works whether or not the card was mounted before (it
   *  usually wasn't — arrivals often come from collapsed sections/undo). */
  enterFrom?: 'left' | 'right' | null;
  /** Called once the entrance animation has been consumed. */
  onEntered?: (id: number) => void;
};

export function SwipeableTaskCard({ task, onSwipeRight, onSwipeLeft, onPress, enterFrom, onEntered }: Props) {
  const { colors, radius } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const crossedDirection = useSharedValue(0); // -1 | 0 | 1, one haptic per crossing

  // Recycle guard: if this cell re-renders for a changed task state without
  // an entrance animation, make sure the card sits at rest. Declared BEFORE
  // the entrance effect so that, in the same commit, the entrance wins.
  // Primitive `isDeleted` (not the Date object) keeps refetches from
  // re-firing this effect.
  const isDeleted = task.deletedAt != null;
  useEffect(() => {
    translateX.value = 0;
    crossedDirection.value = 0;
  }, [task.id, task.isCompleted, isDeleted, translateX, crossedDirection]);

  // Entrance: slide in from the side the task left through. Runs on mount or
  // whenever the screen marks this task as freshly moved.
  useEffect(() => {
    if (enterFrom) {
      translateX.value = (enterFrom === 'left' ? -1 : 1) * screenWidth * 0.6;
      translateX.value = withSpring(0, ENTER_SPRING);
      onEntered?.(task.id);
    }
  }, [enterFrom, task.id, screenWidth, translateX, onEntered]);

  function thresholdHaptic(direction: number) {
    Haptics.impactAsync(
      direction > 0 ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
    );
  }

  function fire(direction: number) {
    if (direction > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSwipeRight(task);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSwipeLeft(task);
    }
  }

  const pan = Gesture.Pan()
    // Horizontal intent only — vertical scrolling must always win.
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      translateX.value = event.translationX;
      const threshold = screenWidth * THRESHOLD_FRACTION;
      const direction = event.translationX > threshold ? 1 : event.translationX < -threshold ? -1 : 0;
      if (direction !== crossedDirection.value) {
        crossedDirection.value = direction;
        if (direction !== 0) runOnJS(thresholdHaptic)(direction);
      }
    })
    .onEnd(() => {
      const threshold = screenWidth * THRESHOLD_FRACTION;
      if (Math.abs(translateX.value) > threshold) {
        const direction = translateX.value > 0 ? 1 : -1;
        translateX.value = withTiming(
          direction * screenWidth,
          { duration: 240, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished) runOnJS(fire)(direction);
          }
        );
      } else {
        translateX.value = withSpring(0, SETTLE_SPRING);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Right-swipe trail (revealed on the left as the card moves right).
  const rightTrailStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > TRAIL_REVEAL_PX ? 1 : 0,
  }));
  const rightIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, screenWidth * 0.1], [0, 1], 'clamp'),
    transform: [
      { scale: interpolate(translateX.value, [0, screenWidth * THRESHOLD_FRACTION], [0.85, 1], 'clamp') },
    ],
  }));

  // Left-swipe trail (revealed on the right as the card moves left).
  const leftTrailStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -TRAIL_REVEAL_PX ? 1 : 0,
  }));
  const leftIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(-translateX.value, [0, screenWidth * 0.1], [0, 1], 'clamp'),
    transform: [
      { scale: interpolate(-translateX.value, [0, screenWidth * THRESHOLD_FRACTION], [0.85, 1], 'clamp') },
    ],
  }));

  // Right swipe = complete for live tasks, restore for completed/trashed ones.
  const rightIsRestore = task.isCompleted || task.deletedAt != null;
  const rightTrailColor = rightIsRestore ? colors.accent : colors.statusOngoingAccent;

  return (
    <GestureDetector gesture={pan}>
      <View>
        <Animated.View
          style={[styles.trail, { backgroundColor: rightTrailColor, borderRadius: radius.card }, rightTrailStyle]}>
          <Animated.View style={[styles.trailIconLeft, rightIconStyle]}>
            <IconSymbol
              name={rightIsRestore ? 'arrow.uturn.backward' : 'checkmark'}
              size={22}
              color={colors.textOnAccent}
            />
          </Animated.View>
        </Animated.View>
        <Animated.View
          style={[
            styles.trail,
            { backgroundColor: colors.statusOverdueAccent, borderRadius: radius.card },
            leftTrailStyle,
          ]}>
          <Animated.View style={[styles.trailIconRight, leftIconStyle]}>
            <IconSymbol name="trash.fill" size={22} color={colors.textOnAccent} />
          </Animated.View>
        </Animated.View>
        <Animated.View style={cardStyle}>
          <TaskCard task={task} onPress={onPress} onToggleComplete={onSwipeRight} onDelete={onSwipeLeft} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  trail: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  trailIconLeft: {
    position: 'absolute',
    left: 20,
  },
  trailIconRight: {
    position: 'absolute',
    right: 20,
  },
});
