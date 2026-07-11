// "How do I make a CSV?" — plain instructions plus a ready-made prompt the
// user can paste into any AI to generate a correctly-formatted schedule CSV
// (the app deliberately has no event-creation UI; the CSV is made elsewhere).
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useUndoToast } from '@/components/undo-toast';
import { useTheme } from '@/lib/theme/use-theme';

const AI_PROMPT = `I need a CSV file for my calendar app. Output ONLY raw CSV text (no explanations, no code fences).

Format rules:
- First line is the header row, exactly: title,date,start time,end time,location,notes,color
- date: YYYY-MM-DD
- start time / end time: 24-hour HH:MM or h:mm AM/PM. Leave start time empty for an all-day event. End time is optional.
- location and notes are optional free text. If a field contains a comma, wrap the whole field in double quotes.
- color is optional: a hex code like #22c55e, or one of: red, orange, yellow, green, teal, blue, indigo, purple, pink, gray.
- One row per event. Repeat rows for recurring events (one row per date).

Here is my schedule, please convert it:
[DESCRIBE YOUR SCHEDULE HERE — e.g. "Math class Mon/Wed/Fri 9:00–10:30 in Room 12 for September 2026, make them green..."]`;

export default function ImportHelpScreen() {
  const router = useRouter();
  const { colors, space, radius, type, monoFont } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const toast = useUndoToast();

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

  async function copyPrompt() {
    await Clipboard.setStringAsync(AI_PROMPT);
    toast.show({ message: 'Prompt copied — paste it into any AI.' });
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <Pressable style={styles.backdropTouch} onPress={close} accessibilityLabel="Close help" />
      <Animated.View
        style={[
          sheetStyle,
          {
            backgroundColor: colors.surfaceElevated,
            borderTopLeftRadius: radius.card,
            borderTopRightRadius: radius.card,
            padding: space.s4,
            paddingBottom: Math.max(insets.bottom, space.s4),
            maxHeight: screenHeight * 0.85,
          },
        ]}>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ gap: space.s3 }}>
          <Text style={[type.h2, { color: colors.textPrimary }]}>Importing a schedule</Text>

          <Text style={[type.body, { color: colors.textSecondary }]}>
            The app doesn’t create events itself — you bring a CSV file (a plain spreadsheet format)
            and import it. Three ways to get one:
          </Text>
          <Text style={[type.body, { color: colors.textSecondary }]}>
            1. Ask an AI (easiest): copy the prompt below, paste it into ChatGPT/Claude/Gemini,
            describe your schedule, and save its reply as a .csv file.{'\n'}
            2. Export from a spreadsheet: build columns in Excel/Google Sheets and use File → Download
            → CSV.{'\n'}
            3. Write it by hand in any text editor — it’s just comma-separated lines.
          </Text>

          <Text style={[type.body, { color: colors.textSecondary }]}>
            Then get the file onto your phone (Files, iCloud, AirDrop, email attachment) and pick it
            from the import screen.
          </Text>

          <Text style={[type.h2, { color: colors.textPrimary, marginTop: space.s2 }]}>The AI prompt</Text>
          <View
            style={{
              backgroundColor: colors.surfaceSunken,
              borderRadius: radius.button,
              padding: space.s3,
            }}>
            <Text style={{ fontFamily: monoFont, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {AI_PROMPT}
            </Text>
          </View>

          <Pressable
            onPress={copyPrompt}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.accent, borderRadius: radius.button, opacity: pressed ? 0.85 : 1 },
            ]}>
            <Text style={[type.body, { color: colors.textOnAccent, fontWeight: '600' }]}>Copy prompt</Text>
          </Pressable>
        </ScrollView>
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
});
