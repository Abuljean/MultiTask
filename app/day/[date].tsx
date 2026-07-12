// Day drill-down from the calendar: that day's tasks as the familiar
// swipeable cards. Presented as a transparent route with a ZOOM transition
// (developer request): the page scales up from the calendar on entry and
// scales back down on exit. Custom header (no native back-swipe — the zoom
// replaces the native push animation).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { EventCard } from '@/components/event-card';
import { SwipeableTaskCard } from '@/components/swipeable-task-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTaskActions } from '@/hooks/use-task-actions';
import { useEvents } from '@/lib/events/use-events';
import { clearEnterMark, getEnterFrom } from '@/lib/enter-marks';
import { localDateKey, parseDateKey } from '@/lib/tasks/calendar';
import { useTasks } from '@/lib/tasks/use-tasks';
import { CONTENT_MAX_WIDTH, pageContent } from '@/lib/theme/layout';
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

  const { data: events } = useEvents();
  const dayEvents = useMemo(
    () =>
      (events ?? [])
        .filter((e) => localDateKey(e.start) === date)
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [events, date]
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

  // Drag-down-to-dismiss from the header (restores a standard escape gesture
  // after the zoom transition replaced the native back-swipe — HIG audit).
  const dragY = useSharedValue(0);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  // Desktop/web: content in a centered column; the exposed gutters CLICK to
  // dismiss (developer request 2026-07-11) and descriptions show inline —
  // the space exists on a laptop, use it.
  const isWide = Platform.OS === 'web' && windowWidth >= 900;

  const zoomStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transformOrigin: hasAnchor ? `${anchorX}px ${anchorY}px 0` : '50% 50% 0',
    transform: [{ translateY: dragY.value }, { scale: scale.value }],
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

  // The ENTIRE page is the drag surface (developer request). The pan runs
  // simultaneously with the inner scroll but only engages while the list sits
  // at the top — mid-list, dragging scrolls as normal. `dragBase` marks where
  // in the gesture the list reached the top, so the page never jumps.
  const scrollTop = useSharedValue(0);
  const dragBase = useSharedValue(-1);
  const scrollGesture = Gesture.Native();

  const pagePan = Gesture.Pan()
    .activeOffsetY(12)
    .failOffsetX([-14, 14]) // horizontal stays with the card swipes
    .simultaneousWithExternalGesture(scrollGesture)
    .onStart(() => {
      dragBase.value = -1;
    })
    .onUpdate((event) => {
      if (scrollTop.value <= 0.5 && event.translationY > 0) {
        if (dragBase.value < 0) dragBase.value = event.translationY;
        dragY.value = Math.max(0, event.translationY - dragBase.value);
      } else {
        dragBase.value = -1;
        dragY.value = 0;
      }
    })
    .onEnd((event) => {
      if (dragY.value > 120 || (dragY.value > 30 && event.velocityY > 800)) {
        // Continue the slide off the bottom, then pop.
        dragY.value = withTiming(windowHeight, { duration: 220, easing: Easing.in(Easing.cubic) });
        opacity.value = withTiming(0, { duration: 220 }, (finished) => {
          if (finished) runOnJS(goBack)();
        });
      } else {
        dragY.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
      }
    });

  const title = day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <Animated.View
      style={[styles.screen, zoomStyle, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <GestureDetector gesture={pagePan}>
        <View style={styles.pageFill}>
          {/* Blank space (the side gutters) exits back to the calendar —
              web/desktop only; the content column renders above this. */}
          {isWide && (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={close}
              accessibilityLabel="Back to calendar"
            />
          )}
          <View style={[styles.header, pageContent, { paddingHorizontal: space.s4, paddingVertical: space.s2, gap: space.s2 }]}>
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
          <View style={pageContent}>
            <Text
              style={[
                type.h1,
                { color: colors.textPrimary, paddingHorizontal: space.s4, paddingBottom: space.s3 },
              ]}>
              {title}
            </Text>
          </View>
          <GestureDetector gesture={scrollGesture}>
            <ScrollView
              bounces={false}
              // Wide: the scroller itself is the centered column so clicks
              // beside it land on the dismiss backdrop.
              style={isWide && { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }}
              onScroll={(e) => {
                scrollTop.value = e.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
              contentContainerStyle={{ padding: space.s4, paddingTop: 0, gap: space.s3 }}
              showsVerticalScrollIndicator={false}>
              {dayEvents.length > 0 && (
                <>
                  <Text style={[type.h2, { color: colors.textSecondary }]}>Schedule</Text>
                  {dayEvents.map((event) => (
                    <EventCard key={event.id} event={event} onPress={(e) => router.push(`/event/${e.id}`)} />
                  ))}
                  {dayTasks.length > 0 && (
                    <Text style={[type.h2, { color: colors.textSecondary, marginTop: space.s2 }]}>Tasks</Text>
                  )}
                </>
              )}
              {dayTasks.length === 0 ? (
                dayEvents.length === 0 ? (
                  <Text style={[type.body, { color: colors.textSecondary }]}>Nothing due this day.</Text>
                ) : null
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
                    showDescription={isWide}
                  />
                ))
              )}
            </ScrollView>
          </GestureDetector>
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pageFill: { flex: 1 },
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
