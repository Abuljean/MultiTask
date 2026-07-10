// Quick-add (docs/design/04) — the app's most important flow. Title + time
// ONLY; everything else stays out of the way (category/subject/priority get
// a "+ details" reveal when the detail view slice lands). Keyboard opens
// immediately on the title field. Date = platform calendar picker, time =
// wheel with 15-minute steps (developer preference from the handoff).
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date>(nextRoundQuarterHour);
  const [picker, setPickerRaw] = useState<'date' | 'time' | null>(null);

  // The picker appearing/disappearing resizes the sheet — animate that as a
  // plain slide (ease-in-out, no bounce, developer preference).
  function setPicker(next: 'date' | 'time' | null) {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    setPickerRaw(next);
  }

  function reset() {
    setTitle('');
    setDueDate(nextRoundQuarterHour());
    setPicker(null);
  }

  function close() {
    reset();
    onClose();
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
        if (picker === 'date') {
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        {/* Backdrop: tap outside to cancel. */}
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close quick add" />
        <View
          style={[
            styles.sheet,
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
            returnKeyType="done"
            onSubmitEditing={submit}
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

          {picker && (
            <DateTimePicker
              value={dueDate}
              mode={picker}
              display={Platform.OS === 'ios' ? (picker === 'date' ? 'inline' : 'spinner') : 'default'}
              minuteInterval={15}
              onChange={onPickerChange}
              accentColor={colors.accent}
              themeVariant={isDark ? 'dark' : 'light'}
            />
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
        </View>
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
    backgroundColor: 'rgba(0,0,0,0.35)',
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
