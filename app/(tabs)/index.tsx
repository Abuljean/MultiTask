// The task list — the app's landing screen. Sections per docs/design/03
// (Completed collapsed at top, then Overdue / Today / Tomorrow / Upcoming /
// No due date), swipeable TaskCards, optimistic mutations, undo toasts.
// Quick-add FAB arrives in the next slice.
import { useMemo } from 'react';
import { LayoutAnimation, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwipeableTaskCard } from '@/components/swipeable-task-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useUndoToast } from '@/components/undo-toast';
import { useCompletedCollapsed } from '@/hooks/use-completed-collapsed';
import { groupTasks } from '@/lib/tasks/sections';
import type { Task } from '@/lib/tasks/types';
import { useDeleteTask, useRestoreTask, useSetTaskCompleted, useTasks } from '@/lib/tasks/use-tasks';
import { useTheme } from '@/lib/theme/use-theme';

export default function TaskListScreen() {
  const insets = useSafeAreaInsets();
  const { colors, space, type } = useTheme();
  const { data: tasks, isLoading, error, refetch, isRefetching } = useTasks();
  const setCompleted = useSetTaskCompleted();
  const deleteTask = useDeleteTask();
  const restoreTask = useRestoreTask();
  const toast = useUndoToast();
  const [completedCollapsed, toggleCompleted] = useCompletedCollapsed();

  const sections = useMemo(() => {
    const grouped = groupTasks(tasks ?? []);
    // Collapsing = keep the header, hide the rows.
    return grouped.map((section) =>
      section.key === 'completed' && completedCollapsed ? { ...section, data: [] } : section
    );
  }, [tasks, completedCollapsed]);

  const completedCount = useMemo(() => (tasks ?? []).filter((t) => t.isCompleted).length, [tasks]);

  function handleComplete(task: Task) {
    setCompleted.mutate({ id: task.id, isCompleted: true });
    toast.show({
      message: 'Task completed.',
      onUndo: () => setCompleted.mutate({ id: task.id, isCompleted: false }),
    });
  }

  function handleUncomplete(task: Task) {
    setCompleted.mutate({ id: task.id, isCompleted: false });
  }

  function handleDelete(task: Task) {
    deleteTask.mutate(task.id);
    toast.show({
      message: 'Task deleted.',
      onUndo: () => restoreTask.mutate(task),
    });
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <Text style={[type.h1, { color: colors.textPrimary, paddingHorizontal: space.s4, paddingVertical: space.s3 }]}>
        Tasks
      </Text>

      {isLoading ? (
        // Skeleton per docs/design/05: grey placeholder cards, no shimmer.
        <View style={{ paddingHorizontal: space.s4, gap: space.s3 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ height: 88, borderRadius: 16, backgroundColor: colors.surfaceSunken }} />
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
          renderSectionHeader={({ section }) =>
            section.key === 'completed' ? (
              <Text
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.create(260, 'easeInEaseOut', 'opacity'));
                  toggleCompleted();
                }}
                accessibilityRole="button"
                accessibilityState={{ expanded: !completedCollapsed }}
                style={[
                  type.h2,
                  {
                    color: colors.textSecondary,
                    backgroundColor: colors.surface,
                    paddingVertical: space.s2,
                  },
                ]}>
                {`Completed (${completedCount})  `}
                <IconSymbol
                  name={completedCollapsed ? 'chevron.right' : 'chevron.down'}
                  size={14}
                  color={colors.textSecondary}
                />
              </Text>
            ) : (
              <View style={{ backgroundColor: colors.surface, paddingVertical: space.s2 }}>
                <Text style={[type.h2, { color: colors.textSecondary }]}>{section.title}</Text>
              </View>
            )
          }
          renderItem={({ item: task }) => (
            <SwipeableTaskCard
              task={task}
              onComplete={handleComplete}
              onUncomplete={handleUncomplete}
              onDelete={handleDelete}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: space.s3 }} />}
          SectionSeparatorComponent={() => <View style={{ height: space.s2 }} />}
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
