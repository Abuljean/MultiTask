// Day drill-down from the calendar: that day's tasks as the familiar
// swipeable cards (tap to edit, swipe to complete/delete). A regular pushed
// screen with the native back gesture — this is the "day view" the calendar
// owns (why the recurring tab is named "Daily" instead).
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SwipeableTaskCard } from '@/components/swipeable-task-card';
import { useTaskActions } from '@/hooks/use-task-actions';
import { clearEnterMark, getEnterFrom } from '@/lib/enter-marks';
import { localDateKey, parseDateKey } from '@/lib/tasks/calendar';
import { useTasks } from '@/lib/tasks/use-tasks';
import { useTheme } from '@/lib/theme/use-theme';

export default function DayScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { colors, space, type } = useTheme();
  const { data: tasks } = useTasks();
  const { handleSwipeRight, handleSwipeLeft } = useTaskActions();

  const day = useMemo(() => parseDateKey(date ?? localDateKey(new Date())), [date]);

  const dayTasks = useMemo(
    () =>
      (tasks ?? [])
        .filter((t) => !t.deletedAt && t.dueDate && localDateKey(t.dueDate) === date)
        .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0)),
    [tasks, date]
  );

  const title = day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <Stack.Screen
        options={{
          title,
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.textPrimary },
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: space.s4, gap: space.s3 }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
