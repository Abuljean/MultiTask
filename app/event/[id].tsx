// Event detail — tap any event card to see everything the CSV carried
// (notes/description especially, which the card doesn't show). Read-only by
// design: events are imported and deleted, never edited. Single-event
// delete lives here (confirmed — no undo path exists for events).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { eventTimeLabel } from '@/components/event-card';
import { useUndoToast } from '@/components/undo-toast';
import { confirmDialog } from '@/lib/confirm';
import { useDeleteEvent, useEvents } from '@/lib/events/use-events';
import { useTheme } from '@/lib/theme/use-theme';

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Number(id);
  const { colors, space, radius, type, monoFont } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { data: events } = useEvents();
  const deleteEvent = useDeleteEvent();
  const toast = useUndoToast();

  const event = events?.find((e) => e.id === eventId);

  const sheetOffset = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);
  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: 220 });
    sheetOffset.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [backdropOpacity, sheetOffset]);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetOffset.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value * 0.35 }));

  function goBack() {
    router.back();
  }
  function close() {
    backdropOpacity.value = withTiming(0, { duration: 220 });
    sheetOffset.value = withTiming(
      screenHeight,
      { duration: 260, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(goBack)();
      }
    );
  }

  // Cache miss (event deleted elsewhere): nothing to show, leave quietly.
  useEffect(() => {
    if (events && !event) router.back();
  }, [events, event, router]);

  if (!event) return null;

  async function confirmDelete() {
    const confirmed = await confirmDialog({
      title: 'Delete this event?',
      message: event?.title,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    deleteEvent.mutate(eventId, {
      onError: () => toast.show({ message: 'Couldn’t delete the event — check your connection.' }),
    });
    toast.show({ message: 'Event deleted.' });
    close();
  }

  const dateLabel = event.start.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const accent = event.color ?? colors.statusEventAccent;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <Pressable style={styles.backdropTouch} onPress={close} accessibilityLabel="Close event" />
      <Animated.View
        style={[
          sheetStyle,
          {
            backgroundColor: colors.surfaceElevated,
            borderTopWidth: 1.5,
            borderLeftWidth: 1.5,
            borderRightWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: accent,
            borderTopLeftRadius: radius.card,
            borderTopRightRadius: radius.card,
            padding: space.s4,
            paddingBottom: Math.max(insets.bottom, space.s4),
            gap: space.s3,
          },
        ]}>
        <Text style={[type.h2, { color: colors.textPrimary }]}>{event.title}</Text>

        <View style={{ gap: space.s1 }}>
          <Text style={[type.body, { color: colors.textSecondary }]}>{dateLabel}</Text>
          <Text style={{ fontFamily: monoFont, fontSize: 13, lineHeight: 18, color: accent }}>
            {eventTimeLabel(event)}
          </Text>
        </View>

        {event.location && (
          <View style={{ gap: 2 }}>
            <Text style={[type.caption, { color: colors.textTertiary }]}>Location</Text>
            <Text style={[type.body, { color: colors.textPrimary }]}>{event.location}</Text>
          </View>
        )}

        {event.notes && (
          <View style={{ gap: 2 }}>
            <Text style={[type.caption, { color: colors.textTertiary }]}>Notes</Text>
            <Text style={[type.body, { color: colors.textPrimary }]}>{event.notes}</Text>
          </View>
        )}

        {event.source && (
          <Text style={[type.caption, { color: colors.textTertiary, fontWeight: '400' }]}>
            Imported from {event.source}
          </Text>
        )}

        <Pressable onPress={confirmDelete} accessibilityRole="button" style={{ paddingVertical: space.s2 }}>
          <Text style={[type.body, { color: colors.statusOverdueAccent }]}>Delete event</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
});
