// Day drill-down from the calendar: that day's tasks as the familiar
// swipeable cards. Presented as a transparent route with a ZOOM transition
// (developer request): the page scales up from the calendar on entry and
// scales back down on exit. Custom header (no native back-swipe — the zoom
// replaces the native push animation).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { SwipeableTaskCard } from '@/components/swipeable-task-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTaskActions } from '@/hooks/use-task-actions';
import { clearEnterMark, getEnterFrom } from '@/lib/enter-marks';
import { localDateKey, parseDateKey } from '@/lib/tasks/calendar';
import { useTasks } from '@/lib/tasks/use-tasks';
import { useTheme } from '@/lib/theme/use-theme';

export default function DayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { date, ax, ay } = useLocalSearchParams<{ date: string; ax?: string; ay?: string }>();
  const { colors, space, type } = useTheme();
  const { data: tasks } = useTasks();
  const { handleSwipeRight, handleSwipeLeft } = useTaskActions();

  const day = useMemo(() => parseDateKey(date ?? localDateKey(new Date())), [date]);

  // Zoom anchor: the tapped day cell's screen position (the route fills the
  // whole window, so page coordinates are container coordinates).
  const anchorX = Number(ax);
  const anchorY = Number(ay);
  const hasAnchor = Number.isFinite(anchorX) && Number.isFinite(anchorY);

  const dayTasks = useMemo(
    () =>
      (tasks ?? [])
        .filter((t) => !t.deletedAt && t.dueDate && localDateKey(t.dueDate) === date)
        .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0)),
    [tasks, date]
  );

  // Zoom in on entry, zoom back out on exit — anchored on the tapped cell,
  // so the page visibly grows out of (and shrinks back into) that day.
  const START_SCALE = hasAnchor ? 0.5 : 0.85;
  const scale = useSharedValue(START_SCALE);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 220 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transformOrigin: hasAnchor ? `${anchorX}px ${anchorY}px 0` : '50% 50% 0',
    transform: [{ scale: scale.value }],
  }));

  function goBack() {
    router.back();
  }

  function close() {
    scale.value = withTiming(START_SCALE, { duration: 220, easing: Easing.in(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(goBack)();
    });
  }

  const title = day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <Animated.View
      style={[styles.screen, zoomStyle, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: space.s4, paddingVertical: space.s2, gap: space.s2 }]}>
        <Pressable
          onPress={close}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back to calendar"
          style={styles.backButton}>
          <IconSymbol name="chevron.left" size={20} color={colors.accent} />
          <Text style={[type.body, { color: colors.accent, fontWeight: '600' }]}>Calendar</Text>
        </Pressable>
      </View>
      <Text style={[type.h1, { color: colors.textPrimary, paddingHorizontal: space.s4, paddingBottom: space.s3 }]}>
        {title}
      </Text>
      <ScrollView
        contentContainerStyle={{ padding: space.s4, paddingTop: 0, gap: space.s3 }}
        showsVerticalScrollIndicator={false}>
        {dayTasks.length === 0 ? (
          <Text style={[type.body, { color: colors.textSecondary }]}>Nothing due this day.</Text>
        ) : (
          dayTasks.map((task) => (
            <SwipeableTaskCard
              key={task.id}
              task={task}
              onSwipeRight={handleSwipeRight}
              onSwipeLeft={handleSwipeLeft}
              onPress={(t) => router.push(`/task/${t.id}`)}
              enterFrom={getEnterFrom(task.id)}
              onEntered={clearEnterMark}
            />
          ))
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
