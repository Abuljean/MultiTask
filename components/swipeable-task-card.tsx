// Mail-style swipeable wrapper around TaskCard (docs/design/04):
//   swipe RIGHT → complete (green trail, check icon) — or restore, if the
//                 task is already completed (accent trail, undo icon)
//   swipe LEFT  → delete (red trail, trash icon)
// Below 40% of screen width the card springs back; crossing 40% ticks a
// haptic; releasing past it slides the card off-screen (240ms ease-out) and
// fires the action. The trail is a solid status color, never a gradient.
// Reanimated animations respect the system reduce-motion setting by default.
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { LayoutAnimation, StyleSheet, useWindowDimensions, View } from 'react-native';
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

const THRESHOLD_FRACTION = 0.4;

type Props = {
  task: Task;
  onComplete: (task: Task) => void;
  onUncomplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  onPress?: (task: Task) => void;
};

export function SwipeableTaskCard({ task, onComplete, onUncomplete, onDelete, onPress }: Props) {
  const { colors, radius } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const crossedDirection = useSharedValue(0); // -1 | 0 | 1, for one haptic per crossing

  // List cells can be recycled when a task changes sections (e.g. after
  // completing); reset the gesture state so the card never stays off-screen.
  useEffect(() => {
    translateX.value = 0;
    crossedDirection.value = 0;
  }, [task.id, task.isCompleted, translateX, crossedDirection]);

  function thresholdHaptic(direction: number) {
    Haptics.impactAsync(
      direction > 0 ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
    );
  }

  function fire(direction: number) {
    // Let the surrounding list animate the gap closing when the row leaves.
    LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
    if (direction > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (task.isCompleted) onUncomplete(task);
      else onComplete(task);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onDelete(task);
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
        translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
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
    opacity: interpolate(translateX.value, [0, screenWidth * 0.12], [0, 1], 'clamp'),
    transform: [
      { scale: interpolate(translateX.value, [0, screenWidth * THRESHOLD_FRACTION], [0.6, 1], 'clamp') },
    ],
  }));

  // Left-swipe trail (revealed on the right as the card moves left).
  const leftTrailStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? 1 : 0,
  }));
  const leftIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(-translateX.value, [0, screenWidth * 0.12], [0, 1], 'clamp'),
    transform: [
      { scale: interpolate(-translateX.value, [0, screenWidth * THRESHOLD_FRACTION], [0.6, 1], 'clamp') },
    ],
  }));

  const completeTrailColor = task.isCompleted ? colors.accent : colors.statusOngoingAccent;

  return (
    <GestureDetector gesture={pan}>
      <View>
        <Animated.View
          style={[styles.trail, { backgroundColor: completeTrailColor, borderRadius: radius.card }, rightTrailStyle]}>
          <Animated.View style={[styles.trailIconLeft, rightIconStyle]}>
            <IconSymbol
              name={task.isCompleted ? 'arrow.uturn.backward' : 'checkmark'}
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
          <TaskCard
            task={task}
            onPress={onPress}
            onToggleComplete={(t) => (t.isCompleted ? onUncomplete(t) : onComplete(t))}
            onDelete={onDelete}
          />
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
