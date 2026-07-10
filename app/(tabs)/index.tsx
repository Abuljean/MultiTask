// The task list — the app's landing screen. Completed (collapsed) at top,
// Overdue / Today / Tomorrow / Upcoming / No due date by time, Deleted
// (collapsed trash) at the bottom. Swipeable cards, optimistic mutations,
// undo toasts, spring regroup animations. Quick-add FAB is the next slice.
import { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@/components/fab';
import { QuickAddSheet } from '@/components/quick-add-sheet';
import { SwipeableTaskCard } from '@/components/swipeable-task-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useUndoToast } from '@/components/undo-toast';
import { useCollapsedSection } from '@/hooks/use-collapsed-section';
import { animateListChanges } from '@/lib/animate-layout';
import { groupTasks, type SectionKey } from '@/lib/tasks/sections';
import type { NewTask, Task } from '@/lib/tasks/types';
import {
  useCreateTask,
  useDeleteTask,
  usePermanentlyDeleteTask,
  useRestoreTask,
  useSetTaskCompleted,
  useTasks,
} from '@/lib/tasks/use-tasks';
import { useTheme } from '@/lib/theme/use-theme';

export default function TaskListScreen() {
  const insets = useSafeAreaInsets();
  const { colors, space, type } = useTheme();
  const { data: tasks, isLoading, error, refetch } = useTasks();
  const setCompleted = useSetTaskCompleted();
  const deleteTask = useDeleteTask();
  const restoreTask = useRestoreTask();
  const permanentlyDelete = usePermanentlyDeleteTask();
  const createTask = useCreateTask();
  const toast = useUndoToast();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
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

  // A failed mutation rolls the optimistic change back — the task visibly
  // snaps back. Without a message that reads as a spooky bug, so every
  // handler surfaces the failure factually.
  function showError(what: string) {
    return () => toast.show({ message: `Couldn’t ${what} — check your connection.` });
  }

  // Entrance bookkeeping: right before a mutation moves a task to another
  // group, note which side its card should slide in from. The card consumes
  // the mark when it renders (it usually mounts fresh — arrivals often come
  // out of collapsed sections or the undo toast, so the card itself can't
  // know it "moved"). Marks expire so a task expanded into view much later
  // doesn't randomly animate.
  const enterMarks = useRef(new Map<number, { from: 'left' | 'right'; at: number }>());
  function markEnter(id: number, from: 'left' | 'right') {
    enterMarks.current.set(id, { from, at: Date.now() });
  }
  function getEnterFrom(id: number): 'left' | 'right' | null {
    const mark = enterMarks.current.get(id);
    if (!mark) return null;
    if (Date.now() - mark.at > 1500) {
      enterMarks.current.delete(id);
      return null;
    }
    return mark.from;
  }
  const clearEnterMark = useCallback((id: number) => {
    enterMarks.current.delete(id);
  }, []);

  function handleSwipeRight(task: Task) {
    animateListChanges();
    markEnter(task.id, 'right');
    if (task.deletedAt) {
      restoreTask.mutate(task.id, { onError: showError('restore the task') });
    } else if (task.isCompleted) {
      setCompleted.mutate({ id: task.id, isCompleted: false }, { onError: showError('update the task') });
    } else {
      setCompleted.mutate({ id: task.id, isCompleted: true }, { onError: showError('complete the task') });
      toast.show({
        message: 'Task completed.',
        onUndo: () => {
          animateListChanges();
          markEnter(task.id, 'right');
          setCompleted.mutate({ id: task.id, isCompleted: false }, { onError: showError('update the task') });
        },
      });
    }
  }

  function handleSwipeLeft(task: Task) {
    animateListChanges();
    if (task.deletedAt) {
      permanentlyDelete.mutate(task.id, { onError: showError('delete the task') });
      toast.show({ message: 'Task permanently deleted.' });
    } else {
      markEnter(task.id, 'left'); // it enters the trash leftward
      deleteTask.mutate(task.id, { onError: showError('delete the task') });
      toast.show({
        message: 'Task deleted.',
        onUndo: () => {
          animateListChanges();
          markEnter(task.id, 'right');
          restoreTask.mutate(task.id, { onError: showError('restore the task') });
        },
      });
    }
  }

  function handleQuickAdd(input: NewTask) {
    // Optimistic: the card appears the moment Add is tapped, sliding into
    // its sorted spot; the server insert happens in the background.
    const tempId = -Date.now();
    animateListChanges();
    markEnter(tempId, 'right');
    createTask.mutate({ input, tempId }, { onError: showError('add the task') });
  }

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

      <Fab bottom={insets.bottom + 24} onPress={() => setQuickAddOpen(true)} />
      <QuickAddSheet visible={quickAddOpen} onClose={() => setQuickAddOpen(false)} onSubmit={handleQuickAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
