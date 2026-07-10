// The task list — the app's landing screen. Sections per docs/design/03
// (Overdue / Today / Tomorrow / Later / No due date / Completed), TaskCards
// per docs/design/02, density-first. Quick-add FAB and swipe gestures arrive
// in the next slices.
import { useMemo } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TaskCard } from '@/components/task-card';
import { groupTasks } from '@/lib/tasks/sections';
import { useSetTaskCompleted, useTasks } from '@/lib/tasks/use-tasks';
import { useTheme } from '@/lib/theme/use-theme';

export default function TaskListScreen() {
  const insets = useSafeAreaInsets();
  const { colors, space, type } = useTheme();
  const { data: tasks, isLoading, error, refetch, isRefetching } = useTasks();
  const setCompleted = useSetTaskCompleted();

  const sections = useMemo(() => groupTasks(tasks ?? []), [tasks]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <Text style={[type.h1, { color: colors.textPrimary, paddingHorizontal: space.s4, paddingVertical: space.s3 }]}>
        Tasks
      </Text>

      {isLoading ? (
        // Skeleton per docs/design/05: grey placeholder cards, no shimmer,
        // no full-screen spinner.
        <View style={{ paddingHorizontal: space.s4, gap: space.s3 }}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={{ height: 88, borderRadius: 16, backgroundColor: colors.surfaceSunken }}
            />
          ))}
        </View>
      ) : error ? (
        <View style={{ paddingHorizontal: space.s4 }}>
          <Text style={[type.body, { color: colors.textPrimary }]}>Couldn’t load tasks.</Text>
          <Text style={[type.body, { color: colors.accent, marginTop: space.s2 }]} onPress={() => refetch()}>
            Retry
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(task) => String(task.id)}
          stickySectionHeadersEnabled
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          contentContainerStyle={{ paddingHorizontal: space.s4, paddingBottom: insets.bottom + space.s6 }}
          renderSectionHeader={({ section }) => (
            <View style={{ backgroundColor: colors.surface, paddingVertical: space.s2 }}>
              <Text style={[type.h2, { color: colors.textSecondary }]}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item: task }) => (
            <TaskCard
              task={task}
              onToggleComplete={(t) => setCompleted.mutate({ id: t.id, isCompleted: !t.isCompleted })}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: space.s3 }} />}
          SectionSeparatorComponent={() => <View style={{ height: space.s2 }} />}
          // Empty state per docs/design/02: factual, small, no illustration,
          // no exclamation points.
          ListEmptyComponent={
            <Text style={[type.body, { color: colors.textSecondary, marginTop: space.s6 }]}>
              No tasks yet.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
