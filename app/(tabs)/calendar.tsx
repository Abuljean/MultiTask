// The Calendar tab (docs/design/03): month view is the default landing —
// 5–6 week grid, each day showing status-colored dots for its tasks. Tap the
// title to zoom out to the year (12 month blocks); tap a day to drill into
// its task list. Recurring dailies never appear here (separate stream), and
// CSV-imported events arrive with the import feature.
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { buildMonthMatrix, localDateKey, tasksByDay } from '@/lib/tasks/calendar';
import { deriveStatus } from '@/lib/tasks/status';
import { useTasks } from '@/lib/tasks/use-tasks';
import { useTheme } from '@/lib/theme/use-theme';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, space, type } = useTheme();
  const { data: tasks } = useTasks();

  const now = new Date();
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based

  const byDay = useMemo(() => tasksByDay(tasks ?? []), [tasks]);
  const weeks = useMemo(() => buildMonthMatrix(year, month), [year, month]);
  const todayKey = localDateKey(now);

  function shiftMonth(delta: number) {
    const shifted = new Date(year, month + delta, 1);
    setYear(shifted.getFullYear());
    setMonth(shifted.getMonth());
  }

  /** Tasks in a given month, for the year view's counts. */
  function monthTaskCount(m: number): number {
    let count = 0;
    for (const [key, list] of byDay) {
      if (key.startsWith(`${year}-${String(m + 1).padStart(2, '0')}`)) count += list.length;
    }
    return count;
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
        onPress={() => router.push(`/day/${key}`)}
        accessibilityRole="button"
        accessibilityLabel={`${date.toDateString()}, ${dayTasks.length} tasks`}
        style={[
          styles.dayCell,
          hasOverdue && { backgroundColor: colors.statusOverdueBg, borderRadius: 8 },
        ]}>
        <View
          style={[
            styles.dayNumberWrap,
            isToday && { backgroundColor: colors.accent, borderRadius: 999 },
          ]}>
          <Text
            style={[
              type.caption,
              { color: isToday ? colors.textOnAccent : colors.textPrimary, fontWeight: isToday ? '600' : '500' },
            ]}>
            {date.getDate()}
          </Text>
        </View>
        <View style={styles.dotRow}>
          {dayTasks.slice(0, 3).map((t) => {
            const status = deriveStatus(t);
            const dotColor =
              status === 'overdue'
                ? colors.statusOverdueAccent
                : status === 'urgent'
                  ? colors.statusUrgentAccent
                  : status === 'completed'
                    ? colors.textTertiary
                    : colors.statusOngoingAccent;
            return <View key={t.id} style={[styles.dot, { backgroundColor: dotColor }]} />;
          })}
          {dayTasks.length > 3 && (
            <Text style={{ fontSize: 8, lineHeight: 8, color: colors.textTertiary }}>+</Text>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.s4, paddingBottom: insets.bottom + space.s6 }}>
        {mode === 'month' ? (
          <>
            <View style={[styles.headerRow, { paddingVertical: space.s3 }]}>
              <Pressable
                onPress={() => setMode('year')}
                accessibilityRole="button"
                accessibilityLabel="Show year"
                style={styles.titleTap}>
                <Text style={[type.h1, { color: colors.textPrimary }]}>
                  {MONTH_NAMES[month]}{' '}
                  <Text style={{ color: colors.textSecondary }}>{year}</Text>
                </Text>
              </Pressable>
              <View style={[styles.navRow, { gap: space.s5 }]}>
                <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} accessibilityLabel="Previous month">
                  <IconSymbol name="chevron.left" size={20} color={colors.accent} />
                </Pressable>
                <Pressable onPress={() => shiftMonth(1)} hitSlop={10} accessibilityLabel="Next month">
                  <IconSymbol name="chevron.right" size={20} color={colors.accent} />
                </Pressable>
              </View>
            </View>

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
          </>
        ) : (
          <>
            <View style={[styles.headerRow, { paddingVertical: space.s3 }]}>
              <Text style={[type.h1, { color: colors.textPrimary }]}>{year}</Text>
              <View style={[styles.navRow, { gap: space.s5 }]}>
                <Pressable onPress={() => setYear((y) => y - 1)} hitSlop={10} accessibilityLabel="Previous year">
                  <IconSymbol name="chevron.left" size={20} color={colors.accent} />
                </Pressable>
                <Pressable onPress={() => setYear((y) => y + 1)} hitSlop={10} accessibilityLabel="Next year">
                  <IconSymbol name="chevron.right" size={20} color={colors.accent} />
                </Pressable>
              </View>
            </View>

            <View style={[styles.monthGrid, { gap: space.s3 }]}>
              {MONTH_NAMES.map((name, m) => {
                const isCurrent = year === now.getFullYear() && m === now.getMonth();
                const count = monthTaskCount(m);
                return (
                  <Pressable
                    key={name}
                    onPress={() => {
                      setMonth(m);
                      setMode('month');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${name} ${year}, ${count} tasks`}
                    style={[
                      styles.monthBlock,
                      {
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
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleTap: { flexShrink: 1 },
  navRow: { flexDirection: 'row', alignItems: 'center' },
  weekRow: { flexDirection: 'row' },
  weekdayLabel: { flex: 1, textAlign: 'center', paddingVertical: 4 },
  dayCell: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    paddingTop: 4,
    gap: 2,
  },
  dayNumberWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 6,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
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
