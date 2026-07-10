// The task card — the most-touched component in the app (docs/design/02).
// Anatomy: left status accent bar · priority badge + title + action button ·
// due date (mono, with warning icon when overdue) · description preview ·
// category/subject pills. Title + due date are ALWAYS visible; everything
// else is subordinate. No drop shadow — cards separate from the background
// by border + surface contrast (anti-generic rule 6).
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Pill, PriorityBadge } from '@/components/pill';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { formatDueDate } from '@/lib/tasks/dates';
import { deriveStatus } from '@/lib/tasks/status';
import type { Task } from '@/lib/tasks/types';
import { useTheme, type Theme } from '@/lib/theme/use-theme';

type Props = {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onPress?: (task: Task) => void;
  onLongPress?: (task: Task) => void;
};

export function TaskCard({ task, onToggleComplete, onPress, onLongPress }: Props) {
  const theme = useTheme();
  const { colors, space, radius, type, monoFont } = theme;
  const status = deriveStatus(task);
  const surfaces = statusSurfaces(theme);
  const { background, accentBar } = surfaces[status];

  return (
    <Pressable
      onPress={onPress && (() => onPress(task))}
      onLongPress={onLongPress && (() => onLongPress(task))}
      accessibilityRole="button"
      accessibilityLabel={`Task: ${task.title}`}
      accessibilityState={{ checked: task.isCompleted }}
      style={[
        styles.card,
        {
          backgroundColor: background,
          borderColor: colors.borderSubtle,
          borderRadius: radius.card,
          padding: space.s4,
          opacity: task.isCompleted ? 0.6 : 1,
        },
      ]}>
      {accentBar && <View style={[styles.accentBar, { backgroundColor: accentBar }]} />}

      <View style={styles.content}>
        <View style={[styles.titleRow, { gap: space.s2 }]}>
          {task.priority != null && <PriorityBadge priority={task.priority} />}
          <Text
            numberOfLines={2}
            style={[
              type.h2,
              styles.title,
              { color: colors.textPrimary },
              task.isCompleted && styles.titleCompleted,
            ]}>
            {task.title}
          </Text>
          <Pressable
            onPress={() => onToggleComplete(task)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={task.isCompleted ? 'Mark as not completed' : 'Mark as completed'}
            style={({ pressed }) => [
              styles.actionButton,
              {
                borderColor: pressed ? colors.accent : colors.borderSubtle,
                backgroundColor: pressed ? colors.accentMuted : 'transparent',
              },
            ]}>
            <IconSymbol
              name={task.isCompleted ? 'arrow.uturn.backward' : 'checkmark'}
              size={16}
              color={colors.textTertiary}
            />
          </Pressable>
        </View>

        <View style={[styles.dueRow, { gap: space.s1 }]}>
          {status === 'overdue' && (
            <IconSymbol name="exclamationmark.triangle.fill" size={12} color={colors.statusOverdueAccent} />
          )}
          <Text
            style={{
              fontFamily: monoFont,
              fontSize: 12,
              lineHeight: 16,
              color: status === 'overdue' ? colors.statusOverdueAccent : colors.textSecondary,
            }}>
            {task.dueDate ? formatDueDate(task.dueDate) : 'No due date'}
          </Text>
        </View>

        {task.description.length > 0 && (
          <Text numberOfLines={1} style={[styles.description, { color: colors.textTertiary }]}>
            {task.description}
          </Text>
        )}

        <View style={[styles.pillRow, { gap: space.s2, marginTop: space.s2 }]}>
          <Pill label={task.category} color={task.categoryColor} />
          {task.subject.length > 0 && <Pill label={task.subject} color={task.subjectColor} />}
        </View>
      </View>
    </Pressable>
  );
}

// Status → card surface + accent bar color (the sacred four, plus completed).
// Redundant encoding per WCAG 1.4.1: status is never color-alone — the accent
// bar, the overdue warning icon, and the completed strikethrough all repeat it.
function statusSurfaces(theme: Theme) {
  const { colors } = theme;
  return {
    default: { background: colors.surfaceElevated, accentBar: null },
    ongoing: { background: colors.statusOngoingBg, accentBar: colors.statusOngoingAccent },
    urgent: { background: colors.statusUrgentBg, accentBar: colors.statusUrgentAccent },
    overdue: { background: colors.statusOverdueBg, accentBar: colors.statusOverdueAccent },
    completed: { background: colors.surfaceElevated, accentBar: null },
  } as const;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  content: {
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
