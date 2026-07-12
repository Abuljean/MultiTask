// The task list — the app's landing screen. Completed (collapsed) at top,
// Overdue / Today / Tomorrow / Upcoming / No due date by time, Deleted
// (collapsed trash) at the bottom. Swipeable cards, optimistic mutations,
// undo toasts, spring regroup animations. Quick-add FAB is the next slice.
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@/components/fab';
import { SearchFilterBar } from '@/components/search-filter-bar';
import { SwipeableTaskCard } from '@/components/swipeable-task-card';
import { SyncStatusDot } from '@/components/sync-status-dot';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useUndoToast } from '@/components/undo-toast';
import { useCollapsedSection } from '@/hooks/use-collapsed-section';
import { useTaskActions } from '@/hooks/use-task-actions';
import { useUrgencyThreshold } from '@/hooks/use-urgency-threshold';
import { animateListChanges } from '@/lib/animate-layout';
import { confirmDialog } from '@/lib/confirm';
import { clearEnterMark, getEnterFrom, markEnter } from '@/lib/enter-marks';
import { EMPTY_FILTERS, filterTasks, hasActiveFilters, type TaskFilters } from '@/lib/tasks/filter';
import { groupTasks } from '@/lib/tasks/sections';
import { pageContent } from '@/lib/theme/layout';
import {
  useBulkPermanentlyDeleteTasks,
  useBulkRestoreTasks,
  useBulkSoftDeleteTasks,
  useTasks,
} from '@/lib/tasks/use-tasks';
import { useTheme } from '@/lib/theme/use-theme';

export default function TaskListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, space, type } = useTheme();
  const { data: tasks, isLoading, error, refetch } = useTasks();
  const { handleSwipeRight, handleSwipeLeft } = useTaskActions();
  const bulkSoftDelete = useBulkSoftDeleteTasks();
  const bulkRestore = useBulkRestoreTasks();
  const bulkPermanentDelete = useBulkPermanentlyDeleteTasks();
  const toast = useUndoToast();
  const [completedCollapsed, toggleCompleted] = useCollapsedSection('ui.completedCollapsed');
  const [deletedCollapsed, toggleDeleted] = useCollapsedSection('ui.deletedCollapsed');
  const urgencyThresholdHours = useUrgencyThreshold();

  // Search + filter. On PHONES: not rendered until deliberately revealed —
  // an overscroll pull at the top, or the magnifier button (developer: keep
  // it hidden, it's a lot of information) — and auto-hidden again on scroll
  // when no criteria are active. On DESKTOP/WEB: permanently open, filters
  // included — the space exists (developer request 2026-07-11).
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowWidth >= 900;
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  const [filterPanelOpen, setFilterPanelOpen] = useState(isDesktop);
  const [searchVisible, setSearchVisible] = useState(false);
  const searchShown = searchVisible || isDesktop;
  const searching = hasActiveFilters(filters);

  function showSearch() {
    if (!searchShown) {
      animateListChanges();
      setSearchVisible(true);
    }
  }

  function hideSearch() {
    if (isDesktop) return; // always open on desktop
    animateListChanges();
    setSearchVisible(false);
    setFilterPanelOpen(false);
    setFilters(EMPTY_FILTERS);
  }

  function onListScroll(event: { nativeEvent: { contentOffset: { y: number } } }) {
    if (isDesktop) return;
    const y = event.nativeEvent.contentOffset.y;
    if (!searchShown && y < -70) {
      // A firm, deliberate pull past the top (iOS overscroll) — tuned hard
      // on purpose (developer request); casual bounces never trigger it.
      showSearch();
    } else if (searchShown && !searching && !filterPanelOpen && y > 100) {
      // Nothing active and the user is scrolling on — tuck it away.
      animateListChanges();
      setSearchVisible(false);
    }
  }

  const filterOptions = useMemo(() => {
    const cats = new Map<string, string>();
    const subs = new Map<string, string>();
    for (const t of tasks ?? []) {
      if (t.deletedAt) continue;
      if (t.category && t.category !== 'Uncategorized' && !cats.has(t.category)) {
        cats.set(t.category, t.categoryColor);
      }
      if (t.subject && !subs.has(t.subject)) subs.set(t.subject, t.subjectColor);
    }
    return {
      categories: [...cats].map(([name, color]) => ({ name, color })),
      subjects: [...subs].map(([name, color]) => ({ name, color })),
    };
  }, [tasks]);

  const results = useMemo(
    () => (searching ? filterTasks(tasks ?? [], filters, { urgencyThresholdHours }) : []),
    [searching, tasks, filters, urgencyThresholdHours]
  );

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
    if (searching) {
      // Filtering hides everything else: one flat results section.
      return [{ key: 'results', title: `Results (${results.length})`, data: results }];
    }
    const grouped = groupTasks(tasks ?? []);
    return grouped.map((section) =>
      (section.key === 'completed' && completedCollapsed) || (section.key === 'deleted' && deletedCollapsed)
        ? { ...section, data: [] }
        : section
    );
  }, [searching, results, tasks, completedCollapsed, deletedCollapsed]);

  const completedCount = useMemo(
    () => (tasks ?? []).filter((t) => t.isCompleted && !t.deletedAt).length,
    [tasks]
  );
  const deletedCount = useMemo(() => (tasks ?? []).filter((t) => t.deletedAt).length, [tasks]);

  // Batch exits: when the section is expanded, every visible card slides
  // off-screen swipe-style in a slight cascade BEFORE the mutation runs (the
  // cache update would otherwise remove the rows instantly, killing the
  // motion). Collapsed sections skip straight to the mutation.
  const [exiting, setExiting] = useState<Map<number, { to: 'left' | 'right'; delayMs: number }>>(new Map());

  function runWithCascade(ids: number[], visible: boolean, mutate: () => void) {
    if (!visible) {
      mutate();
      return;
    }
    const marks = new Map<number, { to: 'left' | 'right'; delayMs: number }>();
    ids.forEach((id, index) => marks.set(id, { to: 'left', delayMs: Math.min(index, 8) * 30 }));
    setExiting(marks);
    const animationWindow = 240 + Math.min(ids.length, 8) * 30 + 40;
    setTimeout(() => {
      setExiting(new Map());
      mutate();
    }, animationWindow);
  }

  // "Clear all completed" — the fix for the web app's most annoying bug.
  // One cascade into the trash, one undo toast for the whole batch, and the
  // section NEVER collapses on you mid-clear.
  function clearAllCompleted() {
    const ids = (tasks ?? []).filter((t) => t.isCompleted && !t.deletedAt).map((t) => t.id);
    if (ids.length === 0) return;
    runWithCascade(ids, !completedCollapsed, () => {
      animateListChanges();
      ids.forEach((id) => markEnter(id, 'left'));
      bulkSoftDelete.mutate(ids, {
        onError: () => toast.show({ message: 'Couldn’t clear completed — check your connection.' }),
      });
      toast.show({
        message: `${ids.length} ${ids.length === 1 ? 'task' : 'tasks'} deleted.`,
        onUndo: () => {
          animateListChanges();
          ids.forEach((id) => markEnter(id, 'right'));
          bulkRestore.mutate(ids, {
            onError: () => toast.show({ message: 'Couldn’t restore — check your connection.' }),
          });
        },
      });
    });
  }

  // Emptying the trash is bulk-permanent — the one action with no undo, so
  // it's also the one action that earns a confirmation dialog.
  async function emptyTrash() {
    const ids = (tasks ?? []).filter((t) => t.deletedAt).map((t) => t.id);
    if (ids.length === 0) return;
    const confirmed = await confirmDialog({
      title: 'Empty trash?',
      message: `${ids.length} ${ids.length === 1 ? 'task' : 'tasks'} will be gone permanently.`,
      confirmLabel: 'Empty',
      destructive: true,
    });
    if (!confirmed) return;
    runWithCascade(ids, !deletedCollapsed, () => {
      animateListChanges();
      bulkPermanentDelete.mutate(ids, {
        onError: () => toast.show({ message: 'Couldn’t empty the trash — check your connection.' }),
      });
      toast.show({ message: 'Trash emptied.' });
    });
  }

  function renderCollapsibleHeader(key: string) {
    const isCompleted = key === 'completed';
    const collapsed = isCompleted ? completedCollapsed : deletedCollapsed;
    const toggle = isCompleted ? toggleCompleted : toggleDeleted;
    const count = isCompleted ? completedCount : deletedCount;
    const label = isCompleted ? `Completed (${count})` : `Deleted (${count})`;
    return (
      <View
        style={[
          styles.sectionHeaderRow,
          { backgroundColor: colors.surface, paddingVertical: space.s2 },
        ]}>
        <Text
          onPress={() => {
            animateListChanges();
            toggle();
          }}
          accessibilityRole="button"
          accessibilityState={{ expanded: !collapsed }}
          style={[type.h2, styles.sectionHeaderLabel, { color: colors.textSecondary }]}>
          {`${label}  `}
          <IconSymbol
            name={collapsed ? 'chevron.right' : 'chevron.down'}
            size={14}
            color={colors.textSecondary}
          />
        </Text>
        {count > 0 && (
          <Text
            onPress={isCompleted ? clearAllCompleted : emptyTrash}
            accessibilityRole="button"
            style={[type.caption, { color: colors.accent, paddingVertical: space.s1 }]}>
            {isCompleted ? 'Clear all' : 'Empty trash'}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      {/* The SCROLLABLE spans the window (scrollbar at the true edge; swipe
          exits travel the full viewport) — content centers itself via
          pageContent inside contentContainerStyle. */}
      <View style={[styles.titleRow, pageContent, { paddingHorizontal: space.s4, paddingVertical: space.s3 }]}>
        <Text style={[type.h1, { color: colors.textPrimary }]}>Tasks</Text>
        <View style={styles.titleActions}>
          <SyncStatusDot />
          {!isDesktop && (
            <Pressable
              onPress={() => (searchVisible ? hideSearch() : showSearch())}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={searchVisible ? 'Hide search' : 'Search tasks'}>
              <IconSymbol name="magnifyingglass" size={20} color={searchVisible ? colors.accent : colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        // Skeleton per docs/design/05: grey placeholder cards, no shimmer.
        <View style={[pageContent, { paddingHorizontal: space.s4, gap: space.s3 }]}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ height: 88, borderRadius: 16, backgroundColor: colors.surfaceSunken }} />
          ))}
        </View>
      ) : error ? (
        <View style={[pageContent, { paddingHorizontal: space.s4 }]}>
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
          onScroll={onListScroll}
          scrollEventThrottle={32}
          ListHeaderComponent={
            searchShown ? (
              <SearchFilterBar
                filters={filters}
                onChange={setFilters}
                panelOpen={filterPanelOpen}
                onTogglePanel={() => setFilterPanelOpen((open) => !open)}
                categories={filterOptions.categories}
                subjects={filterOptions.subjects}
              />
            ) : null
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[pageContent, { paddingHorizontal: space.s4, paddingBottom: insets.bottom + space.s6 }]}
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
              onPress={(t) => router.push(`/task/${t.id}`)}
              enterFrom={getEnterFrom(task.id)}
              onEntered={clearEnterMark}
              exit={exiting.get(task.id) ?? null}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: space.s3 }} />}
          SectionSeparatorComponent={() => <View style={{ height: space.s2 }} />}
          ListEmptyComponent={
            <Text style={[type.body, { color: colors.textSecondary, marginTop: space.s6 }]}>
              {searching ? 'No matching tasks.' : 'No tasks yet.'}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLabel: {
    flexShrink: 1,
  },
});
