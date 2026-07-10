// The task list — the app's landing screen. Completed (collapsed) at top,
// Overdue / Today / Tomorrow / Upcoming / No due date by time, Deleted
// (collapsed trash) at the bottom. Swipeable cards, optimistic mutations,
// undo toasts, spring regroup animations. Quick-add FAB is the next slice.
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@/components/fab';
import { SwipeableTaskCard } from '@/components/swipeable-task-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCollapsedSection } from '@/hooks/use-collapsed-section';
import { useTaskActions } from '@/hooks/use-task-actions';
import { animateListChanges } from '@/lib/animate-layout';
import { clearEnterMark, getEnterFrom } from '@/lib/enter-marks';
import { groupTasks, type SectionKey } from '@/lib/tasks/sections';
import { useTasks } from '@/lib/tasks/use-tasks';
import { useTheme } from '@/lib/theme/use-theme';

export default function TaskListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, space, type } = useTheme();
  const { data: tasks, isLoading, error, refetch } = useTasks();
  const { handleSwipeRight, handleSwipeLeft } = useTaskActions();
  const [completedCollapsed, toggleCompleted] = useCollapsedSection('ui.completedCollapsed');
  const [deletedCollapsed, toggleDeleted] = useCollapsedSection('ui.deletedCollapsed');

  // The refresh spinner appears ONLY for a physical pull-down — background
  // refetches after mutations stay invisible (developer feedback).
  const [pullRefreshing, setPullRefreshing] = useState(false);
  async function onPullRefresh() {
    setPullRefreshing(true);
    try {
      await refetch();
    } finally {
      setPullRefreshing(false);
    }
  }

  const sections = useMemo(() => {
    const grouped = groupTasks(tasks ?? []);
    return grouped.map((section) =>
      (section.key === 'completed' && completedCollapsed) || (section.key === 'deleted' && deletedCollapsed)
        ? { ...section, data: [] }
        : section
    );
  }, [tasks, completedCollapsed, deletedCollapsed]);

  const completedCount = useMemo(
    () => (tasks ?? []).filter((t) => t.isCompleted && !t.deletedAt).length,
    [tasks]
  );
  const deletedCount = useMemo(() => (tasks ?? []).filter((t) => t.deletedAt).length, [tasks]);

  function renderCollapsibleHeader(key: SectionKey) {
    const isCompleted = key === 'completed';
    const collapsed = isCompleted ? completedCollapsed : deletedCollapsed;
    const toggle = isCompleted ? toggleCompleted : toggleDeleted;
    const label = isCompleted ? `Completed (${completedCount})` : `Deleted (${deletedCount})`;
    return (
      <Text
        onPress={() => {
          animateListChanges();
          toggle();
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        style={[
          type.h2,
          { color: colors.textSecondary, backgroundColor: colors.surface, paddingVertical: space.s2 },
        ]}>
        {`${label}  `}
        <IconSymbol
          name={collapsed ? 'chevron.right' : 'chevron.down'}
          size={14}
          color={colors.textSecondary}
        />
      </Text>
    );
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
          refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={onPullRefresh} />}
          contentContainerStyle={{ paddingHorizontal: space.s4, paddingBottom: insets.bottom + space.s6 }}
          renderSectionHeader={({ section }) =>
            section.key === 'completed' || section.key === 'deleted' ? (
              renderCollapsibleHeader(section.key)
            ) : (
              <View style={{ backgroundColor: colors.surface, paddingVertical: space.s2 }}>
                <Text style={[type.h2, { color: colors.textSecondary }]}>{section.title}</Text>
              </View>
            )
          }
          renderItem={({ item: task }) => (
            <SwipeableTaskCard
              task={task}
              onSwipeRight={handleSwipeRight}
              onSwipeLeft={handleSwipeLeft}
              enterFrom={getEnterFrom(task.id)}
              onEntered={clearEnterMark}
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

      <Fab bottom={insets.bottom + 24} onPress={() => router.push('/quick-add')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
