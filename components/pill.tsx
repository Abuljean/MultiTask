// Category/subject pills and the priority tier badge (docs/design/02).
// Small, unobtrusive — present on cards but never competing with the title.
import { StyleSheet, Text, View } from 'react-native';

import { pillColors } from '@/lib/theme/pill-colors';
import { priorityTiers } from '@/lib/theme/tokens';
import { useTheme } from '@/lib/theme/use-theme';

export function Pill({ label, color }: { label: string; color: string }) {
  const { isDark } = useTheme();
  const palette = pillColors(color, isDark);
  return (
    <View style={[styles.pill, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** "1st" / "2nd" / "3rd" — tier colors fixed by the design, not user-picked. */
export function PriorityBadge({ priority }: { priority: number }) {
  const { isDark, colors } = useTheme();
  const tier = priorityTiers[priority];
  const color = tier ? (isDark ? tier.dark : tier.light) : colors.textSecondary;
  const label = tier?.label ?? `${priority}th`;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 20, // grows with Dynamic Type instead of clipping
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
});
