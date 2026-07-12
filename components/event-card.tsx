// Imported calendar event (docs/design/02: visually DISTINCT from tasks —
// event-accent blue, dashed border instead of a solid status bar, no pills,
// no swipe actions). Events are a schedule, not a to-do: nothing to
// complete, nothing to edit.
import { Pressable, StyleSheet, Text } from 'react-native';

import type { CalendarEvent } from '@/lib/events/use-events';
import { useTheme } from '@/lib/theme/use-theme';

export function eventTimeLabel(event: CalendarEvent): string {
  if (event.allDay) return 'All day';
  const fmt = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return event.end ? `${fmt(event.start)} – ${fmt(event.end)}` : fmt(event.start);
}

export function EventCard({
  event,
  onPress,
  showNotes,
}: {
  event: CalendarEvent;
  onPress?: (event: CalendarEvent) => void;
  /** Desktop day page shows the imported notes inline (phones keep them in
   *  the event detail sheet). */
  showNotes?: boolean;
}) {
  const { colors, space, radius, type, monoFont } = useTheme();
  const timeLabel = eventTimeLabel;
  const accent = event.color ?? colors.statusEventAccent;
  return (
    <Pressable
      onPress={onPress && (() => onPress(event))}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Event: ${event.title}, ${timeLabel(event)}`}
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: accent,
          borderRadius: radius.card,
          padding: space.s4,
        },
      ]}>
      <Text numberOfLines={2} style={[type.h2, { color: colors.textPrimary }]}>
        {event.title}
      </Text>
      <Text style={{ fontFamily: monoFont, fontSize: 12, lineHeight: 16, color: accent }}>
        {timeLabel(event)}
      </Text>
      {event.location && (
        <Text numberOfLines={1} style={[type.caption, { color: colors.textSecondary, fontWeight: '400' }]}>
          {event.location}
        </Text>
      )}
      {showNotes && event.notes && (
        <Text numberOfLines={4} style={[type.body, { color: colors.textSecondary }]}>
          {event.notes}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 4,
  },
});
