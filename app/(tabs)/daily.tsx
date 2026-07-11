// The Daily view (docs/design/03 — named "Daily", not "Today", because the
// calendar's future day-drilldown owns "day"; developer decision 2026-07-10).
// Two streams: RECURRING daily tasks (reset each day, never on the calendar)
// as distinct pill-shaped check rows, and regular tasks DUE TODAY (overdue
// included — they're today's reality) reusing the swipeable cards.
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventCard } from '@/components/event-card';
import { SwipeableRow } from '@/components/swipeable-row';
import { SwipeableTaskCard } from '@/components/swipeable-task-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useUndoToast } from '@/components/undo-toast';
import { useTaskActions } from '@/hooks/use-task-actions';
import { animateListChanges } from '@/lib/animate-layout';
import { clearEnterMark, getEnterFrom, markEnter } from '@/lib/enter-marks';
import { useEvents } from '@/lib/events/use-events';
import { localDateKey } from '@/lib/tasks/calendar';
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
  const router = useRouter();
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

  // The uploaded daily schedule (handoff MUST): today's imported events.
  const { data: events } = useEvents();
  const todaysEvents = useMemo(() => {
    const todayKey = localDateKey(new Date());
    return (events ?? [])
      .filter((e) => localDateKey(e.start) === todayKey)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events]);

  // Due today = not deleted, not completed, has a due date before tomorrow
  // (overdue included). Completed today's tasks live on the Tasks tab.
  const dueToday = useMemo(() => {
    const now = new Date();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return (tasksQuery.data ?? [])
      .filter((t) => !t.deletedAt && !t.isCompleted && t.dueDate && t.dueDate.getTime() < tomorrowStart.getTime())
      .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0));
  }, [tasksQuery.data]);

  // Same movement rules as regular tasks (docs/design/05 final values):
  // swipe right = check off (or un-check when in Done), row slides off and
  // re-enters its new group from the right; swipe left = remove (archive)
  // with an undo toast — no confirmation dialogs when undo exists.
  function toggleDone(task: RecurringTask) {
    animateListChanges();
    markEnter(`rec:${task.id}`, 'right');
    setDone.mutate(
      { id: task.id, done: !task.doneToday },
      { onError: () => toast.show({ message: 'Couldn’t update — check your connection.' }) }
    );
  }

  function tapToggleDone(task: RecurringTask) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleDone(task);
  }

  function removeRecurring(task: RecurringTask) {
    animateListChanges();
    archiveRecurring.mutate(task.id, {
      onError: () => toast.show({ message: 'Couldn’t remove — check your connection.' }),
    });
    toast.show({
      message: 'Daily task removed.',
      onUndo: () => {
        animateListChanges();
        markEnter(`rec:${task.id}`, 'right');
        unarchiveRecurring.mutate(task);
      },
    });
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
  const pendingRecurring = (recurring.data ?? []).filter((t) => !t.doneToday);
  const doneRecurring = (recurring.data ?? []).filter((t) => t.doneToday);

  function renderRecurringRow(task: RecurringTask) {
    return (
      <SwipeableRow
        key={task.id}
        rightAction={
          task.doneToday
            ? { color: colors.accent, icon: 'arrow.uturn.backward' }
            : { color: colors.statusOngoingAccent, icon: 'checkmark' }
        }
        leftAction={{ color: colors.statusOverdueAccent, icon: 'trash.fill' }}
        onSwipeRight={() => toggleDone(task)}
        onSwipeLeft={() => removeRecurring(task)}
        resetKey={`rec:${task.id}|${task.doneToday}`}
        enterFrom={getEnterFrom(`rec:${task.id}`)}
        onEntered={() => clearEnterMark(`rec:${task.id}`)}>
        <Pressable
          onPress={() => tapToggleDone(task)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.doneToday }}
          accessibilityLabel={task.title}
          accessibilityActions={[{ name: 'delete', label: 'Remove daily task' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'delete') removeRecurring(task);
          }}
          style={[
            styles.recurringRow,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderSubtle,
              paddingHorizontal: space.s4,
              gap: space.s3,
            },
          ]}>
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
      </SwipeableRow>
    );
  }

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
            {pendingRecurring.map(renderRecurringRow)}

            {(recurring.data ?? []).length === 0 && (
              <Text style={[type.body, { color: colors.textSecondary }]}>No daily tasks yet.</Text>
            )}

            {doneRecurring.length > 0 && (
              <>
                <Text style={[type.h2, { color: colors.textSecondary, marginTop: space.s2 }]}>Done</Text>
                {doneRecurring.map(renderRecurringRow)}
              </>
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

        {/* ------------------------- Schedule -------------------------- */}
        {todaysEvents.length > 0 && (
          <>
            <Text style={[type.h2, { color: colors.textSecondary, marginTop: space.s6, marginBottom: space.s2 }]}>
              Schedule
            </Text>
            <View style={{ gap: space.s2 }}>
              {todaysEvents.map((event) => (
                <EventCard key={event.id} event={event} onPress={(e) => router.push(`/event/${e.id}`)} />
              ))}
            </View>
          </>
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
                onPress={(t) => router.push(`/task/${t.id}`)}
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
    minHeight: 48, // min, not fixed: Dynamic Type grows rows
    paddingVertical: 8,
    borderRadius: 999, // pill-shaped per the design doc — distinct from task cards
    borderWidth: 1,
  },
  recurringTitle: {
    flex: 1,
    fontWeight: '500',
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  addInput: {
    minHeight: 44,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 999,
    fontSize: 15,
  },
  ghostRow: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
});
