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
import { useEffect, useRef } from 'react';
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

const THRESHOLD_FRACTION = 0.3;

// High damping: springs settle quickly with barely any sway (developer
// feedback — "it has to settle faster, there can't be too much swaying").
const SETTLE_SPRING = { damping: 26, stiffness: 240 };

type Props = {
  task: Task;
  onSwipeRight: (task: Task) => void;
  onSwipeLeft: (task: Task) => void;
  onPress?: (task: Task) => void;
};

export function SwipeableTaskCard({ task, onSwipeRight, onSwipeLeft, onPress }: Props) {
  const { colors, radius } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const crossedDirection = useSharedValue(0); // -1 | 0 | 1, one haptic per crossing

  // When THIS task changes group (completed/restored/trashed/undone), its row
  // slides IN from the side it left through — continuity with the swipe that
  // sent it away. A plain re-render (refetch, scroll) must NOT animate, so we
  // compare against the previous state in a ref. Primitive `isDeleted` (not
  // the Date object) keeps refetches from re-firing the effect.
  const isDeleted = task.deletedAt != null;
  const prevGroupState = useRef<{ id: number; completed: boolean; deleted: boolean } | null>(null);
  useEffect(() => {
    const previous = prevGroupState.current;
    prevGroupState.current = { id: task.id, completed: task.isCompleted, deleted: isDeleted };
    crossedDirection.value = 0;
    const movedGroups =
      previous !== null &&
      previous.id === task.id &&
      (previous.completed !== task.isCompleted || previous.deleted !== isDeleted);
    if (movedGroups) {
      // Into the trash = left swipe sent it away → enter from the left.
      // Everything else exits right → enter from the right.
      const fromDirection = isDeleted ? -1 : 1;
      translateX.value = fromDirection * screenWidth * 0.6;
      translateX.value = withSpring(0, SETTLE_SPRING);
    } else {
      translateX.value = 0;
    }
  }, [task.id, task.isCompleted, isDeleted, screenWidth, translateX, crossedDirection]);

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
    opacity: translateX.value > 0 ? 1 : 0,
  }));
  const rightIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, screenWidth * 0.1], [0, 1], 'clamp'),
    transform: [
      { scale: interpolate(translateX.value, [0, screenWidth * THRESHOLD_FRACTION], [0.85, 1], 'clamp') },
    ],
  }));

  // Left-swipe trail (revealed on the right as the card moves left).
  const leftTrailStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? 1 : 0,
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
