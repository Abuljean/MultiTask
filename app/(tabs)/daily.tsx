// The Daily view (docs/design/03 — named "Daily", not "Today", because the
// calendar's future day-drilldown owns "day"; developer decision 2026-07-10).
// Two streams: RECURRING daily tasks (reset each day, never on the calendar)
// as distinct pill-shaped check rows, and regular tasks DUE TODAY (overdue
// included — they're today's reality) reusing the swipeable cards.
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwipeableTaskCard } from '@/components/swipeable-task-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useUndoToast } from '@/components/undo-toast';
import { useTaskActions } from '@/hooks/use-task-actions';
import { clearEnterMark, getEnterFrom } from '@/lib/enter-marks';
import {
  useAddRecurringTask,
  useArchiveRecurringTask,
  useRecurringTasks,
  useSetRecurringDone,
  useUnarchiveRecurringTask,
  type RecurringTask,
} from '@/lib/tasks/use-recurring';
import { useTasks } from '@/lib/tasks/use-tasks';
import { useTheme } from '@/lib/theme/use-theme';

export default function DailyScreen() {
  const insets = useSafeAreaInsets();
  const { colors, space, type } = useTheme();
  const toast = useUndoToast();

  const recurring = useRecurringTasks();
  const setDone = useSetRecurringDone();
  const addRecurring = useAddRecurringTask();
  const archiveRecurring = useArchiveRecurringTask();
  const unarchiveRecurring = useUnarchiveRecurringTask();

  const tasksQuery = useTasks();
  const { handleSwipeRight, handleSwipeLeft } = useTaskActions();

  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [pullRefreshing, setPullRefreshing] = useState(false);

  async function onPullRefresh() {
    setPullRefreshing(true);
    try {
      await Promise.all([recurring.refetch(), tasksQuery.refetch()]);
    } finally {
      setPullRefreshing(false);
    }
  }

  // Due today = not deleted, not completed, has a due date before tomorrow
  // (overdue included). Completed today's tasks live on the Tasks tab.
  const dueToday = useMemo(() => {
    const now = new Date();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return (tasksQuery.data ?? [])
      .filter((t) => !t.deletedAt && !t.isCompleted && t.dueDate && t.dueDate.getTime() < tomorrowStart.getTime())
      .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0));
  }, [tasksQuery.data]);

  function toggleDone(task: RecurringTask) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDone.mutate(
      { id: task.id, done: !task.doneToday },
      { onError: () => toast.show({ message: 'Couldn’t update — check your connection.' }) }
    );
  }

  function confirmArchive(task: RecurringTask) {
    // Long-press affordance; archive keeps history and has undo.
    Alert.alert('Remove daily task?', `"${task.title}" will stop appearing. Its history is kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          archiveRecurring.mutate(task.id, {
            onError: () => toast.show({ message: 'Couldn’t remove — check your connection.' }),
          });
          toast.show({ message: 'Daily task removed.', onUndo: () => unarchiveRecurring.mutate(task) });
        },
      },
    ]);
  }

  function submitNew() {
    const trimmed = newTitle.trim();
    setAdding(false);
    setNewTitle('');
    if (!trimmed) return;
    const maxSort = Math.max(0, ...(recurring.data ?? []).map((t) => t.sortOrder));
    addRecurring.mutate(
      { title: trimmed, sortOrder: maxSort + 1, tempId: -Date.now() },
      { onError: () => toast.show({ message: 'Couldn’t add — check your connection.' }) }
    );
  }

  const today = new Date();

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={onPullRefresh} />}
        contentContainerStyle={{ paddingHorizontal: space.s4, paddingBottom: insets.bottom + space.s6 }}>
        <Text style={[type.h1, { color: colors.textPrimary, paddingTop: space.s3 }]}>Daily</Text>
        <Text style={[type.body, { color: colors.textSecondary, marginBottom: space.s4 }]}>
          {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {/* ------------------------- Recurring ------------------------- */}
        <Text style={[type.h2, { color: colors.textSecondary, marginBottom: space.s2 }]}>Recurring</Text>

        {recurring.isLoading ? (
          <View style={{ gap: space.s2 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ height: 48, borderRadius: 999, backgroundColor: colors.surfaceSunken }} />
            ))}
          </View>
        ) : recurring.error ? (
          <Text style={[type.body, { color: colors.textPrimary }]}>Couldn’t load daily tasks.</Text>
        ) : (
          <View style={{ gap: space.s2 }}>
            {(recurring.data ?? []).map((task) => (
              <Pressable
                key={task.id}
                onPress={() => toggleDone(task)}
                onLongPress={() => confirmArchive(task)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.doneToday }}
                accessibilityLabel={task.title}
                style={[
                  styles.recurringRow,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.borderSubtle,
                    paddingHorizontal: space.s4,
                    gap: space.s3,
                  },
                ]}>
                <View
                  style={[
                    styles.checkCircle,
                    {
                      borderColor: task.doneToday ? colors.accent : colors.textTertiary,
                      backgroundColor: task.doneToday ? colors.accent : 'transparent',
                    },
                  ]}>
                  {task.doneToday && <IconSymbol name="checkmark" size={14} color={colors.textOnAccent} />}
                </View>
                <Text
                  style={[
                    type.body,
                    styles.recurringTitle,
                    { color: colors.textPrimary, opacity: task.doneToday ? 0.55 : 1 },
                    task.doneToday && styles.struck,
                  ]}
                  numberOfLines={1}>
                  {task.title}
                </Text>
              </Pressable>
            ))}

            {(recurring.data ?? []).length === 0 && (
              <Text style={[type.body, { color: colors.textSecondary }]}>No daily tasks yet.</Text>
            )}
          </View>
        )}

        {/* Always-visible add affordance: a ghost pill row matching the
            recurring rows' shape, so it can't be missed but stays calm. */}
        {!recurring.isLoading && (
          <View style={{ marginTop: space.s2 }}>
            {adding ? (
              <TextInput
                style={[
                  styles.addInput,
                  {
                    borderColor: colors.borderSubtle,
                    color: colors.textPrimary,
                    paddingHorizontal: space.s4,
                  },
                ]}
                placeholder="Daily task title"
                placeholderTextColor={colors.textTertiary}
                value={newTitle}
                onChangeText={setNewTitle}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={submitNew}
                onBlur={submitNew}
              />
            ) : (
              <Pressable
                onPress={() => setAdding(true)}
                accessibilityRole="button"
                accessibilityLabel="New daily task"
                style={[
                  styles.recurringRow,
                  styles.ghostRow,
                  { borderColor: colors.borderSubtle, paddingHorizontal: space.s4, gap: space.s3 },
                ]}>
                <IconSymbol name="plus" size={18} color={colors.textTertiary} />
                <Text style={[type.body, { color: colors.textSecondary }]}>New daily task</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ------------------------- Due today ------------------------- */}
        <Text style={[type.h2, { color: colors.textSecondary, marginTop: space.s6, marginBottom: space.s2 }]}>
          Due today
        </Text>
        {dueToday.length === 0 ? (
          <Text style={[type.body, { color: colors.textSecondary }]}>Nothing due today.</Text>
        ) : (
          <View style={{ gap: space.s3 }}>
            {dueToday.map((task) => (
              <SwipeableTaskCard
                key={task.id}
                task={task}
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
                enterFrom={getEnterFrom(task.id)}
                onEntered={clearEnterMark}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 999, // pill-shaped per the design doc — distinct from task cards
    borderWidth: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurringTitle: {
    flex: 1,
    fontWeight: '500',
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  addInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 999,
    fontSize: 15,
  },
  ghostRow: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
});
