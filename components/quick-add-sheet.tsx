// Quick-add (docs/design/04) — the app's most important flow. Title + time
// ONLY; everything else stays out of the way (category/subject/priority get
// a "+ details" reveal when the detail view slice lands). Keyboard opens
// immediately on the title field. Date = platform calendar picker, time =
// wheel with 15-minute steps (developer preference from the handoff).
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { NewTask } from '@/lib/tasks/types';
import { useTheme } from '@/lib/theme/use-theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (task: NewTask) => void;
};

/** Next quarter-hour from now — the default due time per the spec. */
function nextRoundQuarterHour(): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil((d.getMinutes() + 1) / 15) * 15);
  return d;
}

export function QuickAddSheet({ visible, onClose, onSubmit }: Props) {
  const { colors, space, radius, type, monoFont, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // The sheet's open/close is animated manually (Modal has animationType
  // "none"): the built-in Modal dismissal gets visually cut short when the
  // keyboard drops at the same time. Here the sheet slides down IN SYNC with
  // the keyboard, and the backdrop fades alongside.
  const sheetOffset = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 220 });
      sheetOffset.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    }
  }, [visible, backdropOpacity, sheetOffset]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetOffset.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.35,
  }));
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date>(nextRoundQuarterHour);
  // `picker` = which chip is logically active; `renderedPicker` keeps the
  // content mounted while the close animation runs.
  const [picker, setPickerRaw] = useState<'date' | 'time' | null>(null);
  const [renderedPicker, setRenderedPicker] = useState<'date' | 'time' | null>(null);
  const pickerHeight = useSharedValue(0);

  // The picker reveal is an explicitly animated height (slide open/closed,
  // ease-in-out, no bounce). LayoutAnimation was tried first but silently
  // does nothing inside a Modal on the new architecture.
  const PICKER_HEIGHTS = { date: 360, time: 216 } as const;
  function setPicker(next: 'date' | 'time' | null) {
    setPickerRaw(next);
    if (Platform.OS !== 'ios') {
      // Android pickers are system dialogs, not inline — nothing to animate.
      setRenderedPicker(next);
      return;
    }
    if (next) {
      setRenderedPicker(next);
      pickerHeight.value = withTiming(PICKER_HEIGHTS[next], {
        duration: 220,
        easing: Easing.inOut(Easing.cubic),
      });
    } else {
      pickerHeight.value = withTiming(0, { duration: 220, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setRenderedPicker)(null);
      });
    }
  }

  const pickerContainerStyle = useAnimatedStyle(() => ({
    height: pickerHeight.value,
    overflow: 'hidden',
  }));

  function reset() {
    setTitle('');
    setDueDate(nextRoundQuarterHour());
    setPicker(null);
  }

  function finishClose() {
    reset();
    onClose();
  }

  function close() {
    // Keyboard and sheet leave together; the modal unmounts only after the
    // slide-down completes.
    Keyboard.dismiss();
    backdropOpacity.value = withTiming(0, { duration: 220 });
    sheetOffset.value = withTiming(
      screenHeight,
      { duration: 260, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishClose)();
      }
    );
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit({ title: trimmed, dueDate });
    close();
  }

  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
    // Android fires 'dismissed' when the dialog is cancelled.
    if (event.type === 'dismissed') {
      setPicker(null);
      return;
    }
    if (selected) {
      setDueDate((current) => {
        const next = new Date(current);
        if (renderedPicker === 'date') {
          next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
        } else {
          next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
        }
        return next;
      });
    }
    // Android pickers are one-shot dialogs; iOS inline pickers stay open.
    if (Platform.OS === 'android') setPicker(null);
  }

  const chipStyle = {
    backgroundColor: colors.surfaceSunken,
    borderColor: colors.borderSubtle,
    borderRadius: radius.button,
    paddingHorizontal: space.s3,
    paddingVertical: space.s2,
  } as const;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      {/* Backdrop: tap outside to cancel. */}
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <Pressable style={styles.backdropTouch} onPress={close} accessibilityLabel="Close quick add" />
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            {
              backgroundColor: colors.surfaceElevated,
              borderTopLeftRadius: radius.card,
              borderTopRightRadius: radius.card,
              padding: space.s4,
              paddingBottom: Math.max(insets.bottom, space.s4),
            },
          ]}>
          <View style={[styles.grabber, { backgroundColor: colors.borderSubtle }]} />

          <TextInput
            style={[
              styles.titleInput,
              {
                borderColor: colors.borderSubtle,
                borderRadius: radius.button,
                color: colors.textPrimary,
                paddingHorizontal: space.s3,
              },
            ]}
            placeholder="Task title"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            autoFocus
            // Done on the keyboard only dismisses the keyboard (blur), making
            // room for the pickers — with keyboard + calendar open the sheet
            // nearly fills the screen. Adding happens ONLY via the Add task
            // button (developer decision, 2026-07-10).
            returnKeyType="done"
          />

          <View style={[styles.chipRow, { gap: space.s2, marginTop: space.s3 }]}>
            <Pressable
              onPress={() => setPicker(picker === 'date' ? null : 'date')}
              accessibilityRole="button"
              accessibilityLabel="Change due date"
              style={chipStyle}>
              <Text style={{ fontFamily: monoFont, fontSize: 13, color: colors.textPrimary }}>
                {dueDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPicker(picker === 'time' ? null : 'time')}
              accessibilityRole="button"
              accessibilityLabel="Change due time"
              style={chipStyle}>
              <Text style={{ fontFamily: monoFont, fontSize: 13, color: colors.textPrimary }}>
                {dueDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </Pressable>
          </View>

          {Platform.OS === 'ios' ? (
            <Animated.View style={pickerContainerStyle}>
              {renderedPicker && (
                <DateTimePicker
                  value={dueDate}
                  mode={renderedPicker}
                  display={renderedPicker === 'date' ? 'inline' : 'spinner'}
                  minuteInterval={15}
                  onChange={onPickerChange}
                  accentColor={colors.accent}
                  themeVariant={isDark ? 'dark' : 'light'}
                />
              )}
            </Animated.View>
          ) : (
            renderedPicker && (
              <DateTimePicker
                value={dueDate}
                mode={renderedPicker}
                display="default"
                minuteInterval={15}
                onChange={onPickerChange}
                accentColor={colors.accent}
                themeVariant={isDark ? 'dark' : 'light'}
              />
            )
          )}

          <Pressable
            onPress={submit}
            disabled={!title.trim()}
            accessibilityRole="button"
            accessibilityLabel="Add task"
            style={({ pressed }) => [
              styles.addButton,
              {
                backgroundColor: colors.accent,
                borderRadius: radius.button,
                marginTop: space.s4,
                opacity: !title.trim() ? 0.3 : pressed ? 0.85 : 1,
              },
            ]}>
            <Text style={[type.body, { color: colors.textOnAccent, fontWeight: '600' }]}>Add task</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000', // opacity is animated
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: '100%',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  titleInput: {
    height: 44,
    borderWidth: 1,
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
  },
  addButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
