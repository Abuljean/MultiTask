// The Calendar tab (docs/design/03), phone-calendar style: the month view is
// a continuous VERTICAL SCROLL of months (no arrows) — the current month's
// header is full-color, every other month's header is grey. Tapping the year
// in the top bar zooms out to a scrolling year view (12 blocks per year);
// tapping a month scrolls the month view there. Tap a day to drill into its
// task list. Fixed 6-week month grids keep scroll positions exact.
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { buildMonthMatrix, localDateKey, tasksByDay } from '@/lib/tasks/calendar';
import { deriveStatus } from '@/lib/tasks/status';
import type { Task } from '@/lib/tasks/types';
import { useTasks } from '@/lib/tasks/use-tasks';
import { useTheme } from '@/lib/theme/use-theme';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Fixed geometry so FlatList can jump straight to any month/year.
const DAY_CELL_HEIGHT = 68;
const MONTH_HEADER_HEIGHT = 44;
const WEEKDAY_ROW_HEIGHT = 24;
const MONTH_BOTTOM_GAP = 24;
const MONTH_ITEM_HEIGHT = MONTH_HEADER_HEIGHT + WEEKDAY_ROW_HEIGHT + 6 * DAY_CELL_HEIGHT + MONTH_BOTTOM_GAP;

const YEAR_TITLE_HEIGHT = 44;
const YEAR_BLOCK_HEIGHT = 84;
const YEAR_GRID_GAP = 12;
const YEAR_BOTTOM_GAP = 24;
const YEAR_ITEM_HEIGHT = YEAR_TITLE_HEIGHT + 4 * YEAR_BLOCK_HEIGHT + 3 * YEAR_GRID_GAP + YEAR_BOTTOM_GAP;

// Scroll ranges around the current date.
const MONTHS_BACK = 24;
const MONTHS_FORWARD = 36;
const YEARS_BACK = 5;
const YEARS_FORWARD = 6;

type MonthItem = { year: number; month: number };

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, space, type } = useTheme();
  const { data: tasks } = useTasks();

  const now = new Date();
  const todayKey = localDateKey(now);
  const [mode, setMode] = useState<'month' | 'year'>('month');
  // The month the month-list should open at (changed by the year view).
  const [anchor, setAnchor] = useState<MonthItem>({ year: now.getFullYear(), month: now.getMonth() });
  // The year currently visible while scrolling months (for the top bar).
  const [visibleYear, setVisibleYear] = useState(now.getFullYear());

  const byDay = useMemo(() => tasksByDay(tasks ?? []), [tasks]);

  const monthItems = useMemo<MonthItem[]>(() => {
    const items: MonthItem[] = [];
    for (let offset = -MONTHS_BACK; offset <= MONTHS_FORWARD; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      items.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const years = useMemo(() => {
    const current = now.getFullYear();
    return Array.from({ length: YEARS_BACK + YEARS_FORWARD + 1 }, (_, i) => current - YEARS_BACK + i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const anchorIndex = monthItems.findIndex((m) => m.year === anchor.year && m.month === anchor.month);

  const onViewableMonthsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]?.item as MonthItem | undefined;
    if (first) setVisibleYear(first.year);
  });

  function statusDotColor(task: Task): string {
    const status = deriveStatus(task);
    if (status === 'overdue') return colors.statusOverdueAccent;
    if (status === 'urgent') return colors.statusUrgentAccent;
    if (status === 'completed') return colors.textTertiary;
    return colors.statusOngoingAccent;
  }

  function renderDayCell(date: Date | null, index: number) {
    if (!date) {
      return <View key={`blank-${index}`} style={styles.dayCell} />;
    }
    const key = localDateKey(date);
    const dayTasks = byDay.get(key) ?? [];
    const isToday = key === todayKey;
    const hasOverdue = dayTasks.some((t) => deriveStatus(t) === 'overdue');
    return (
      <Pressable
        key={key}
        onPress={() => router.push({ pathname: '/day/[date]', params: { date: key } })}
        accessibilityRole="button"
        accessibilityLabel={`${date.toDateString()}, ${dayTasks.length} tasks`}
        style={[
          styles.dayCell,
          { borderColor: colors.borderSubtle },
          hasOverdue && { backgroundColor: colors.statusOverdueBg },
        ]}>
        <View style={[styles.dayNumberWrap, isToday && { backgroundColor: colors.accent, borderRadius: 999 }]}>
          <Text
            style={{
              fontSize: 15,
              lineHeight: 20,
              fontWeight: isToday ? '600' : '500',
              color: isToday ? colors.textOnAccent : colors.textPrimary,
            }}>
            {date.getDate()}
          </Text>
        </View>
        <View style={styles.dotRow}>
          {dayTasks.slice(0, 3).map((t) => (
            <View key={t.id} style={[styles.dot, { backgroundColor: statusDotColor(t) }]} />
          ))}
          {dayTasks.length > 3 && (
            <Text style={{ fontSize: 9, lineHeight: 9, color: colors.textTertiary }}>+</Text>
          )}
        </View>
      </Pressable>
    );
  }

  function renderMonth({ item }: { item: MonthItem }) {
    const isCurrentMonth = item.year === now.getFullYear() && item.month === now.getMonth();
    const weeks = buildMonthMatrix(item.year, item.month, true);
    return (
      <View style={{ height: MONTH_ITEM_HEIGHT }}>
        {/* Current month reads full-color; all others grey — the scroll
            position IS the navigation, so color marks "you are here". */}
        <Text
          style={[
            type.h2,
            styles.monthHeader,
            { color: isCurrentMonth ? colors.accent : colors.textTertiary },
          ]}>
          {MONTH_NAMES[item.month]} {item.year}
        </Text>
        <View style={styles.weekRow}>
          {WEEKDAY_LABELS.map((label, i) => (
            <Text key={i} style={[type.caption, styles.weekdayLabel, { color: colors.textTertiary }]}>
              {label}
            </Text>
          ))}
        </View>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map(renderDayCell)}
          </View>
        ))}
      </View>
    );
  }

  function monthTaskCount(year: number, month: number): number {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let count = 0;
    for (const [key, list] of byDay) {
      if (key.startsWith(prefix)) count += list.length;
    }
    return count;
  }

  function renderYear({ item: year }: { item: number }) {
    const isCurrentYear = year === now.getFullYear();
    return (
      <View style={{ height: YEAR_ITEM_HEIGHT }}>
        <Text
          style={[
            type.h1,
            { height: YEAR_TITLE_HEIGHT, color: isCurrentYear ? colors.accent : colors.textTertiary },
          ]}>
          {year}
        </Text>
        <View style={[styles.monthGrid, { gap: YEAR_GRID_GAP }]}>
          {MONTH_NAMES.map((name, m) => {
            const isCurrent = isCurrentYear && m === now.getMonth();
            const count = monthTaskCount(year, m);
            return (
              <Pressable
                key={name}
                onPress={() => {
                  setAnchor({ year, month: m });
                  setVisibleYear(year);
                  setMode('month');
                }}
                accessibilityRole="button"
                accessibilityLabel={`${name} ${year}, ${count} tasks`}
                style={[
                  styles.monthBlock,
                  {
                    height: YEAR_BLOCK_HEIGHT,
                    backgroundColor: colors.surfaceElevated,
                    borderColor: isCurrent ? colors.accent : colors.borderSubtle,
                    borderWidth: isCurrent ? 1.5 : 1,
                    padding: space.s3,
                  },
                ]}>
                <Text style={[type.h2, { color: colors.textPrimary }]}>{name.slice(0, 3)}</Text>
                <Text style={[type.caption, { color: colors.textTertiary }]}>
                  {count === 0 ? '—' : `${count} task${count === 1 ? '' : 's'}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { paddingHorizontal: space.s4, paddingVertical: space.s2 }]}>
        {mode === 'month' ? (
          <Pressable
            onPress={() => {
              setAnchor({ year: visibleYear, month: now.getMonth() });
              setMode('year');
            }}
            accessibilityRole="button"
            accessibilityLabel="Show year view"
            style={styles.yearButton}>
            <IconSymbol name="chevron.left" size={16} color={colors.accent} />
            <Text style={[type.body, { color: colors.accent, fontWeight: '600' }]}>{visibleYear}</Text>
          </Pressable>
        ) : (
          <Text style={[type.body, { color: colors.textSecondary }]}>Years</Text>
        )}
      </View>

      {mode === 'month' ? (
        <FlatList
          key={`months-${anchor.year}-${anchor.month}`}
          data={monthItems}
          renderItem={renderMonth}
          keyExtractor={(item) => `${item.year}-${item.month}`}
          getItemLayout={(_, index) => ({
            length: MONTH_ITEM_HEIGHT,
            offset: MONTH_ITEM_HEIGHT * index,
            index,
          })}
          initialScrollIndex={Math.max(0, anchorIndex)}
          onViewableItemsChanged={onViewableMonthsChanged.current}
          viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: space.s4, paddingBottom: insets.bottom + space.s6 }}
        />
      ) : (
        <FlatList
          data={years}
          renderItem={renderYear}
          keyExtractor={(year) => String(year)}
          getItemLayout={(_, index) => ({
            length: YEAR_ITEM_HEIGHT,
            offset: YEAR_ITEM_HEIGHT * index,
            index,
          })}
          initialScrollIndex={years.indexOf(visibleYear) >= 0 ? years.indexOf(visibleYear) : YEARS_BACK}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: space.s4, paddingBottom: insets.bottom + space.s6 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  monthHeader: {
    height: MONTH_HEADER_HEIGHT,
    textAlignVertical: 'center',
    paddingTop: 12,
  },
  weekRow: { flexDirection: 'row' },
  weekdayLabel: { flex: 1, textAlign: 'center', height: WEEKDAY_ROW_HEIGHT, paddingTop: 4 },
  dayCell: {
    flex: 1,
    height: DAY_CELL_HEIGHT,
    alignItems: 'center',
    paddingTop: 6,
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  dayNumberWrap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 8,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthBlock: {
    width: '30%',
    flexGrow: 1,
    borderRadius: 16,
    gap: 2,
  },
});
