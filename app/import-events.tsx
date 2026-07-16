// CSV event import (handoff MUST). Pick a file → preview what parsed (and
// what didn't) → import. No in-app event creation by design: the CSV is
// made elsewhere. Transparent sheet route, same shell pattern as quick-add.
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useUndoToast } from '@/components/undo-toast';
import { confirmDialog } from '@/lib/confirm';
import { csvToEvents, NAMED_EVENT_COLORS, type CsvImportResult } from '@/lib/events/csv';
import { useDeleteAllEvents, useEvents, useImportEvents } from '@/lib/events/use-events';
import { useTheme } from '@/lib/theme/use-theme';

// Swatches for the whole-import default (rows with their own color column
// keep it). First option = the theme's standard event blue (stored as null
// so it adapts to dark mode).
const COLOR_CHOICES = ['red', 'orange', 'yellow', 'green', 'teal', 'indigo', 'purple', 'pink'].map(
  (name) => ({ name, hex: NAMED_EVENT_COLORS[name] })
);

export default function ImportEventsScreen() {
  const router = useRouter();
  const { colors, space, radius, type } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const toast = useUndoToast();

  const { data: existingEvents } = useEvents();
  const importEvents = useImportEvents();
  const deleteAllEvents = useDeleteAllEvents();

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<CsvImportResult | null>(null);
  const [defaultColor, setDefaultColor] = useState<string | null>(null);

  // Sheet enter/exit — same shell as the task form.
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

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'public.comma-separated-values-text', '*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    // readAsStringAsync loads the whole file into memory — a mis-picked
    // video would hang or OOM the app. Any plausible calendar CSV is far
    // under 5 MB.
    if (asset.size != null && asset.size > 5 * 1024 * 1024) {
      toast.show({ message: 'That file is too large for a calendar CSV (5 MB max).' });
      return;
    }
    try {
      const text = await readAsStringAsync(asset.uri);
      setFileName(asset.name);
      setParsed(csvToEvents(text));
    } catch {
      toast.show({ message: 'Couldn’t read that file.' });
    }
  }

  function runImport() {
    if (!parsed || parsed.events.length === 0) return;
    importEvents.mutate(
      { events: parsed.events, source: fileName ?? 'import.csv', defaultColor },
      {
        onSuccess: (count) => {
          toast.show({ message: `${count} event${count === 1 ? '' : 's'} imported.` });
          close();
        },
        onError: (error) => toast.show({ message: `Import failed: ${error.message}` }),
      }
    );
  }

  async function confirmDeleteAll() {
    const count = existingEvents?.length ?? 0;
    const confirmed = await confirmDialog({
      title: 'Delete all events?',
      message: `${count} imported event${count === 1 ? '' : 's'} will be removed.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    deleteAllEvents.mutate(undefined, {
      onSuccess: () => toast.show({ message: 'All events deleted.' }),
      onError: () => toast.show({ message: 'Couldn’t delete events — check your connection.' }),
    });
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <Pressable style={styles.backdropTouch} onPress={close} accessibilityLabel="Close import" />
      <Animated.View
        style={[
          sheetStyle,
          {
            backgroundColor: colors.surfaceElevated,
            borderTopLeftRadius: radius.card,
            borderTopRightRadius: radius.card,
            padding: space.s4,
            paddingBottom: Math.max(insets.bottom, space.s4),
            gap: space.s3,
          },
        ]}>
        <Text style={[type.h2, { color: colors.textPrimary }]}>Import calendar events</Text>
        <Text style={[type.body, { color: colors.textSecondary }]}>
          A CSV with columns like title, date, start time, end time, location, color. Rows without a
          time become all-day events.
        </Text>
        <Pressable
          onPress={() => router.push('/import-help')}
          accessibilityRole="button"
          style={{ paddingVertical: space.s1 }}>
          <Text style={[type.body, { color: colors.accent }]}>How do I make a CSV? (with an AI prompt)</Text>
        </Pressable>

        <Text style={[type.caption, { color: colors.textSecondary }]}>Event color</Text>
        <View style={[styles.swatchRow, { gap: space.s2 }]}>
          <Pressable
            onPress={() => setDefaultColor(null)}
            // 30pt swatch + 7 slop = 44pt touch target.
            hitSlop={7}
            accessibilityRole="button"
            accessibilityLabel="Default blue"
            accessibilityState={{ selected: defaultColor === null }}
            style={[
              styles.swatch,
              {
                backgroundColor: colors.statusEventAccent,
                borderWidth: defaultColor === null ? 2.5 : 0,
                borderColor: colors.textPrimary,
              },
            ]}
          />
          {COLOR_CHOICES.map(({ name, hex }) => (
            <Pressable
              key={hex}
              onPress={() => setDefaultColor(hex)}
              hitSlop={7}
              accessibilityRole="button"
              // Color NAME, not hex — VoiceOver reading "#f97316" aloud
              // helps nobody.
              accessibilityLabel={name}
              accessibilityState={{ selected: defaultColor === hex }}
              style={[
                styles.swatch,
                {
                  backgroundColor: hex,
                  borderWidth: defaultColor === hex ? 2.5 : 0,
                  borderColor: colors.textPrimary,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[type.caption, { color: colors.textTertiary, fontWeight: '400' }]}>
          Applies to rows without their own color column.
        </Text>

        <Pressable
          onPress={pickFile}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.accent, borderRadius: radius.button, opacity: pressed ? 0.85 : 1 },
          ]}>
          <Text style={[type.body, { color: colors.textOnAccent, fontWeight: '600' }]}>
            {fileName ? 'Choose a different file' : 'Choose CSV file'}
          </Text>
        </Pressable>

        {parsed && (
          <View style={{ gap: space.s2 }}>
            <Text style={[type.body, { color: colors.textPrimary }]}>
              {fileName}: {parsed.events.length} event{parsed.events.length === 1 ? '' : 's'} ready
              {parsed.errors.length > 0 ? `, ${parsed.errors.length} row${parsed.errors.length === 1 ? '' : 's'} skipped` : ''}
              .
            </Text>
            {parsed.errors.slice(0, 3).map((error) => (
              <Text key={error} style={[type.caption, { color: colors.statusOverdueAccent, fontWeight: '400' }]}>
                {error}
              </Text>
            ))}
            {parsed.events.slice(0, 3).map((event, i) => (
              <Text key={i} numberOfLines={1} style={[type.caption, { color: colors.textSecondary, fontWeight: '400' }]}>
                {event.title} — {event.start.toLocaleDateString()}{' '}
                {event.allDay ? '(all day)' : event.start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </Text>
            ))}
            {parsed.events.length > 0 && (
              <Pressable
                onPress={runImport}
                disabled={importEvents.isPending}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: colors.statusEventAccent,
                    borderRadius: radius.button,
                    opacity: importEvents.isPending ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}>
                <Text style={[type.body, { color: colors.textOnAccent, fontWeight: '600' }]}>
                  {importEvents.isPending ? 'Importing…' : `Import ${parsed.events.length} event${parsed.events.length === 1 ? '' : 's'}`}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {(existingEvents?.length ?? 0) > 0 && (
          <Pressable onPress={confirmDeleteAll} accessibilityRole="button" style={{ paddingVertical: space.s2 }}>
            <Text style={[type.body, { color: colors.statusOverdueAccent }]}>
              Delete all {existingEvents?.length} imported events
            </Text>
          </Pressable>
        )}
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
  primaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
});
