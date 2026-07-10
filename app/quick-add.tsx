// Quick-add (docs/design/04) — the app's most important flow. The everyday
// path stays title + time; everything optional lives behind a collapsed
// "Details" section (priority, existing categories/subjects, description).
// Presented as a TRANSPARENT MODAL ROUTE, not an RN <Modal>: Modal hosts
// content in a separate native window where Reanimated updates silently fail
// to apply. The task list stays visible behind the backdrop.
//
// Dismissal is tap-outside (or Add) ONLY — the body scrolls, and scrolling
// can never close the sheet (bounces off, no swipe-to-dismiss). Developer
// requirement: no accidental scroll-outs.
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useUndoToast } from '@/components/undo-toast';
import { animateListChanges } from '@/lib/animate-layout';
import { markEnter } from '@/lib/enter-marks';
import type { NewTask } from '@/lib/tasks/types';
import { useCreateTask, useTasks } from '@/lib/tasks/use-tasks';
import { priorityTiers } from '@/lib/theme/tokens';
import { useTheme } from '@/lib/theme/use-theme';

/** Default due time: today at 11:59 PM (developer decision 2026-07-10 —
 *  supersedes the earlier "next quarter-hour" default). */
function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return d;
}

const SLIDE = { duration: 220, easing: Easing.inOut(Easing.cubic) } as const;

/** Measured-height collapsible: children render at natural size (absolutely,
 *  clipped) and the container's height animates between 0 and that size. */
function Collapsible({ open, children }: PropsWithChildren<{ open: boolean }>) {
  const contentHeight = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, SLIDE);
  }, [open, progress]);

  const style = useAnimatedStyle(() => ({
    height: contentHeight.value * progress.value,
    opacity: progress.value,
    overflow: 'hidden',
  }));

  return (
    <Animated.View style={style}>
      <View
        style={styles.collapsibleInner}
        onLayout={(e) => {
          contentHeight.value = e.nativeEvent.layout.height;
        }}>
        {children}
      </View>
    </Animated.View>
  );
}

export default function QuickAddScreen() {
  const router = useRouter();
  const { colors, space, radius, type, monoFont, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const createTask = useCreateTask();
  const toast = useUndoToast();

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date>(endOfToday);
  const [description, setDescription] = useState('');
  const [priority, setPriorityValue] = useState<number | null>(null);
  const [category, setCategory] = useState<{ name: string; color: string } | null>(null);
  const [subject, setSubject] = useState<{ name: string; color: string } | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Existing categories/subjects, data-driven from the user's real tasks
  // (same philosophy as the web app). Creating NEW ones (with a color
  // picker) belongs to the task-detail slice.
  const { data: tasks } = useTasks();
  const { categories, subjects } = useMemo(() => {
    const cats = new Map<string, string>();
    const subs = new Map<string, string>();
    for (const t of tasks ?? []) {
      if (t.category && t.category !== 'Uncategorized' && !cats.has(t.category)) {
        cats.set(t.category, t.categoryColor);
      }
      if (t.subject && !subs.has(t.subject)) {
        subs.set(t.subject, t.subjectColor);
      }
    }
    return {
      categories: [...cats].map(([name, color]) => ({ name, color })),
      subjects: [...subs].map(([name, color]) => ({ name, color })),
    };
  }, [tasks]);

  // Sheet surface stays anchored to the screen bottom and pads itself by the
  // keyboard height — no backdrop gap under the box.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Sheet enter/exit: slide up on mount; on close, dismiss the keyboard and
  // slide down in sync with it, then pop the route.
  const sheetOffset = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: 220 });
    sheetOffset.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [backdropOpacity, sheetOffset]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetOffset.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.35,
  }));

  function goBack() {
    router.back();
  }

  function close() {
    Keyboard.dismiss();
    backdropOpacity.value = withTiming(0, { duration: 220 });
    sheetOffset.value = withTiming(
      screenHeight,
      { duration: 260, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(goBack)();
      }
    );
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const input: NewTask = {
      title: trimmed,
      dueDate,
      ...(description.trim().length > 0 && { description: description.trim() }),
      ...(priority != null && { priority }),
      ...(category && { category: category.name, categoryColor: category.color }),
      ...(subject && { subject: subject.name, subjectColor: subject.color }),
    };
    const tempId = -Date.now();
    animateListChanges();
    markEnter(tempId, 'right');
    createTask.mutate(
      { input, tempId },
      { onError: () => toast.show({ message: 'Couldn’t add the task — check your connection.' }) }
    );
    close();
  }

  // Date/time picker reveal — animated height, slide open/closed.
  const [picker, setPickerRaw] = useState<'date' | 'time' | null>(null);
  const [renderedPicker, setRenderedPicker] = useState<'date' | 'time' | null>(null);
  const pickerHeight = useSharedValue(0);
  const PICKER_HEIGHTS = { date: 360, time: 216 } as const;

  function setPicker(next: 'date' | 'time' | null) {
    setPickerRaw(next);
    if (Platform.OS !== 'ios') {
      setRenderedPicker(next);
      return;
    }
    if (next) {
      setRenderedPicker(next);
      pickerHeight.value = withTiming(PICKER_HEIGHTS[next], SLIDE);
    } else {
      pickerHeight.value = withTiming(0, SLIDE, (finished) => {
        if (finished) runOnJS(setRenderedPicker)(null);
      });
    }
  }

  const pickerContainerStyle = useAnimatedStyle(() => ({
    height: pickerHeight.value,
    overflow: 'hidden',
  }));

  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
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
    if (Platform.OS === 'android') setPicker(null);
  }

  const chipStyle = {
    backgroundColor: colors.surfaceSunken,
    borderColor: colors.borderSubtle,
    borderRadius: radius.button,
    paddingHorizontal: space.s3,
    paddingVertical: space.s2,
  } as const;

  function SelectChip({
    label,
    selected,
    onPress,
    color,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
    color?: string;
  }) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={{
          borderWidth: 1.5,
          borderColor: selected ? colors.accent : colors.borderSubtle,
          backgroundColor: selected ? colors.accentMuted : 'transparent',
          borderRadius: radius.button,
          paddingHorizontal: space.s3,
          height: 40,
          justifyContent: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.s2,
        }}>
        {color && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />}
        <Text style={[type.body, { color: selected ? colors.accent : colors.textPrimary }]}>{label}</Text>
      </Pressable>
    );
  }

  const maxBodyHeight = Math.max(200, screenHeight - keyboardHeight - insets.top - 220);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      {/* Tap outside to cancel — the ONLY way to dismiss besides Add. */}
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
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + space.s3 : Math.max(insets.bottom, space.s4),
          },
        ]}>
        <View style={[styles.grabber, { backgroundColor: colors.borderSubtle }]} />

        <ScrollView
          style={{ maxHeight: maxBodyHeight }}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
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
            // Done only dismisses the keyboard; adding is the button's job.
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
                onChange={onPickerChange}
                accentColor={colors.accent}
                themeVariant={isDark ? 'dark' : 'light'}
              />
            )
          )}

          {/* ---------------------- Details (collapsed) ---------------------- */}
          <Pressable
            onPress={() => setDetailsOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: detailsOpen }}
            style={[styles.detailsToggle, { marginTop: space.s3, gap: space.s1 }]}>
            <Text style={[type.body, { color: colors.accent }]}>Details</Text>
            <IconSymbol
              name={detailsOpen ? 'chevron.down' : 'chevron.right'}
              size={14}
              color={colors.accent}
            />
          </Pressable>

          <Collapsible open={detailsOpen}>
            <View style={{ gap: space.s3, paddingTop: space.s2 }}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Priority</Text>
              <View style={[styles.wrapRow, { gap: space.s2 }]}>
                <SelectChip label="None" selected={priority == null} onPress={() => setPriorityValue(null)} />
                {[1, 2, 3].map((tier) => (
                  <SelectChip
                    key={tier}
                    label={priorityTiers[tier].label}
                    selected={priority === tier}
                    onPress={() => setPriorityValue(tier)}
                  />
                ))}
              </View>

              {categories.length > 0 && (
                <>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Category</Text>
                  <View style={[styles.wrapRow, { gap: space.s2 }]}>
                    {categories.map((c) => (
                      <SelectChip
                        key={c.name}
                        label={c.name}
                        color={c.color}
                        selected={category?.name === c.name}
                        onPress={() => setCategory(category?.name === c.name ? null : c)}
                      />
                    ))}
                  </View>
                </>
              )}

              {subjects.length > 0 && (
                <>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Subject</Text>
                  <View style={[styles.wrapRow, { gap: space.s2 }]}>
                    {subjects.map((s) => (
                      <SelectChip
                        key={s.name}
                        label={s.name}
                        color={s.color}
                        selected={subject?.name === s.name}
                        onPress={() => setSubject(subject?.name === s.name ? null : s)}
                      />
                    ))}
                  </View>
                </>
              )}

              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[
                  styles.descriptionInput,
                  {
                    borderColor: colors.borderSubtle,
                    borderRadius: radius.button,
                    color: colors.textPrimary,
                    padding: space.s3,
                  },
                ]}
                placeholder="Optional notes"
                placeholderTextColor={colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>
          </Collapsible>
        </ScrollView>

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
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  collapsibleInner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  detailLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  descriptionInput: {
    minHeight: 72,
    borderWidth: 1,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  addButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
