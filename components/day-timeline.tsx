// The day page's timeline body: hour ruler down the left edge, EVENTS as
// duration-sized blocks in the left lane, TASKS as uniform rows in the right
// lane anchored to their due time (one-tap complete circle — a swipe in a
// narrow lane fights the vertical scroll). Geometry comes entirely from the
// tested layout engine (lib/tasks/day-timeline.ts); this file renders
// rectangles and wires presses.
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import type { CalendarEvent } from '@/lib/events/use-events';
import { layoutDayTimeline, type TimelineConfig } from '@/lib/tasks/day-timeline';
import { deriveStatus, type TaskStatus } from '@/lib/tasks/status';
import type { Task } from '@/lib/tasks/types';
import { readableTextColor } from '@/lib/theme/pill-colors';
import { useTheme } from '@/lib/theme/use-theme';

const CONFIG: TimelineConfig = { pxPerHour: 64, taskHeight: 46, taskGap: 6, minEventHeight: 28 };
const RULER_WIDTH = 52;

function timeRange(event: CalendarEvent): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return event.end ? `${fmt(event.start)} – ${fmt(event.end)}` : fmt(event.start);
}

type Props = {
  events: CalendarEvent[];
  tasks: Task[];
  urgencyThresholdHours: number;
  /** Local now — only passed when this page is showing TODAY (draws the now line). */
  now?: Date | null;
  onPressEvent: (event: CalendarEvent) => void;
  onPressTask: (task: Task) => void;
  /** The complete/restore toggle (same handler as a swipe-right). */
  onToggleTask: (task: Task) => void;
};

export function DayTimeline({
  events,
  tasks,
  urgencyThresholdHours,
  now,
  onPressEvent,
  onPressTask,
  onToggleTask,
}: Props) {
  const { colors, space, radius, type, monoFont, isDark } = useTheme();

  const layout = useMemo(
    () =>
      layoutDayTimeline(
        events.map((e) => ({ id: e.id, start: e.start, end: e.end, allDay: e.allDay })),
        tasks.filter((t) => t.dueDate).map((t) => ({ id: t.id, due: t.dueDate as Date })),
        CONFIG
      ),
    [events, tasks]
  );

  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const statusAccent = (status: TaskStatus) =>
    status === 'overdue'
      ? colors.statusOverdueAccent
      : status === 'urgent'
        ? colors.statusUrgentAccent
        : status === 'ongoing'
          ? colors.statusOngoingAccent
          : colors.textTertiary;

  const nowTop =
    now != null
      ? (now.getHours() + now.getMinutes() / 60 - layout.startHour) * CONFIG.pxPerHour
      : null;

  return (
    <View style={{ height: layout.height }}>
      {/* Hour ruler + hairlines across both lanes. */}
      {layout.hours.map((mark) => (
        <View key={mark.hour} pointerEvents="none" style={[styles.hourRow, { top: mark.top }]}>
          <Text
            style={{
              width: RULER_WIDTH - 8,
              textAlign: 'right',
              fontFamily: monoFont,
              fontSize: 10,
              color: colors.textTertiary,
              transform: [{ translateY: -5 }],
            }}>
            {mark.label}
          </Text>
          <View style={[styles.hairline, { backgroundColor: colors.borderSubtle }]} />
        </View>
      ))}

      {/* Events lane (left). */}
      <View style={[styles.lane, { left: RULER_WIDTH, right: '52%' }]}>
        {layout.events.map((block) => {
          const event = eventById.get(block.id);
          if (!event) return null;
          const eventColor = event.color ?? colors.statusEventAccent;
          const laneWidth = 100 / block.cols;
          return (
            <Pressable
              key={block.id}
              onPress={() => onPressEvent(event)}
              accessibilityRole="button"
              accessibilityLabel={`${event.title}, ${timeRange(event)}`}
              style={{
                position: 'absolute',
                top: block.top,
                height: block.height,
                left: `${block.col * laneWidth}%`,
                width: `${laneWidth}%`,
                paddingRight: block.col === block.cols - 1 ? 0 : 4,
              }}>
              <View
                style={[
                  styles.eventBlock,
                  {
                    borderRadius: radius.tight,
                    backgroundColor: colors.surfaceElevated,
                    borderLeftColor: eventColor,
                    borderColor: colors.borderSubtle,
                  },
                ]}>
                <Text
                  numberOfLines={block.height > 40 ? 2 : 1}
                  style={[type.caption, { color: colors.textPrimary }]}>
                  {event.title}
                </Text>
                {block.height >= 40 && (
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: monoFont,
                      fontSize: 9,
                      color: readableTextColor(eventColor, isDark),
                    }}>
                    {timeRange(event)}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Tasks lane (right) — uniform rows, one-tap complete. */}
      <View style={[styles.lane, { left: '50%', right: 0 }]}>
        {layout.tasks.map((block) => {
          const task = taskById.get(block.id);
          if (!task) return null;
          const status = deriveStatus(task, { urgencyThresholdHours });
          const accent = statusAccent(status);
          const done = task.isCompleted;
          const due = task.dueDate as Date;
          return (
            // The check button is a SIBLING of the row pressable, not a child
            // — nested pressables render nested <button> elements on web
            // (invalid HTML, hydration errors, and the RNW hover bug).
            <View
              key={block.id}
              style={[
                styles.taskRow,
                {
                  position: 'absolute',
                  top: block.top,
                  left: 0,
                  right: 0,
                  height: CONFIG.taskHeight,
                  borderRadius: radius.tight,
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderSubtle,
                },
              ]}>
              <Pressable
                onPress={() => onPressTask(task)}
                accessibilityRole="button"
                accessibilityLabel={`${task.title}, ${done ? 'completed' : status}`}
                style={styles.taskBody}>
                <View style={[styles.taskBar, { backgroundColor: done ? colors.textTertiary : accent }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={[
                      type.caption,
                      {
                        color: done ? colors.textTertiary : colors.textPrimary,
                        textDecorationLine: done ? 'line-through' : 'none',
                      },
                    ]}>
                    {task.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: monoFont,
                      fontSize: 9,
                      color: !done && status === 'overdue' ? accent : colors.textTertiary,
                    }}>
                    {due.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => onToggleTask(task)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={done ? `Un-complete ${task.title}` : `Complete ${task.title}`}
                style={styles.checkButton}>
                <IconSymbol
                  name={done ? 'checkmark' : 'circle'}
                  size={20}
                  color={done ? colors.textTertiary : accent}
                />
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* The now line — only when viewing today. */}
      {nowTop != null && nowTop >= 0 && nowTop <= layout.height && (
        <View pointerEvents="none" style={[styles.nowLine, { top: nowTop }]}>
          <View style={[styles.nowDot, { backgroundColor: colors.statusOverdueAccent }]} />
          <View style={[styles.nowHairline, { backgroundColor: colors.statusOverdueAccent }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hairline: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    marginTop: 0,
  },
  lane: { position: 'absolute', top: 0, bottom: 0 },
  eventBlock: {
    flex: 1,
    borderWidth: 1,
    borderLeftWidth: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingRight: 6,
    overflow: 'hidden',
  },
  taskBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 8,
    minWidth: 0,
  },
  taskBar: { width: 3, alignSelf: 'stretch' },
  checkButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowLine: {
    position: 'absolute',
    left: RULER_WIDTH - 4,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowDot: { width: 7, height: 7, borderRadius: 4 },
  nowHairline: { flex: 1, height: 1.5 },
});
