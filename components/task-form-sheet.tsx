// The task form sheet — shared by quick-add (app/quick-add.tsx) and the task
// detail/edit view (app/task/[id].tsx). The everyday path stays title + time;
// everything optional lives behind the collapsed Details section (priority,
// categories/subjects incl. "+ New" with a color palette, description).
//
// Hosted by TRANSPARENT MODAL ROUTES, never an RN <Modal> (Reanimated
// silently no-ops in Modal's separate native window). Dismissal is
// tap-outside or the submit button ONLY — the body scrolls and scrolling can
// never close the sheet.
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { CollapsibleReveal } from '@/components/collapsible-reveal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { endOfToday } from '@/lib/tasks/dates';
import { useTasks } from '@/lib/tasks/use-tasks';
import { priorityTiers } from '@/lib/theme/tokens';
import { useTheme } from '@/lib/theme/use-theme';

export type NamedColor = { name: string; color: string };

export type TaskFormValues = {
  title: string;
  dueDate: Date | null;
  description: string;
  priority: number | null;
  category: NamedColor | null;
  subject: NamedColor | null;
};

type Props = {
  submitLabel: string;
  autoFocusTitle?: boolean;
  initial?: Partial<TaskFormValues>;
  /** Called with the final values right before the sheet slides away. */
  onSubmit: (values: TaskFormValues) => void;
};

const SLIDE = { duration: 220, easing: Easing.inOut(Easing.cubic) } as const;

// 12-swatch palette for new categories/subjects (docs/design/02). The pill
// contrast logic auto-adjusts text, so any of these stays readable.
const SWATCHES = [
  '#f87171', '#fb923c', '#fbbf24', '#fef08a', '#a3e635', '#4ade80',
  '#2dd4bf', '#60a5fa', '#818cf8', '#c084fc', '#f472b6', '#e5e7eb',
];

/** Inline creator for a new category/subject: name + swatch, Done to create. */
function NewOptionCreator({ placeholder, onCreate }: { placeholder: string; onCreate: (option: NamedColor) => void }) {
  const { colors, space, radius } = useTheme();
  const [name, setName] = useState('');
  const [color, setColor] = useState(SWATCHES[7]);

  function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate({ name: trimmed, color });
    setName('');
  }

  return (
    <View style={{ gap: space.s2 }}>
      <TextInput
        style={{
          height: 40,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          borderRadius: radius.button,
          color: colors.textPrimary,
          paddingHorizontal: space.s3,
          fontSize: 15,
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={name}
        onChangeText={setName}
        returnKeyType="done"
        onSubmitEditing={create}
      />
      <View style={[styles.wrapRow, { gap: space.s2 }]}>
        {SWATCHES.map((swatch) => (
          <Pressable
            key={swatch}
            onPress={() => setColor(swatch)}
            accessibilityRole="button"
            accessibilityLabel={`Color ${swatch}`}
            accessibilityState={{ selected: color === swatch }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: swatch,
              borderWidth: color === swatch ? 2.5 : 0,
              borderColor: colors.accent,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function TaskFormSheet({ submitLabel, autoFocusTitle = false, initial, onSubmit }: Props) {
  const router = useRouter();
  const { colors, space, radius, type, monoFont, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [dueDate, setDueDate] = useState<Date | null>(initial?.dueDate ?? null);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priority, setPriorityValue] = useState<number | null>(initial?.priority ?? null);
  const [category, setCategory] = useState<NamedColor | null>(initial?.category ?? null);
  const [subject, setSubject] = useState<NamedColor | null>(initial?.subject ?? null);
  // Open Details from the start when editing a task that already uses them.
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(initial?.description || initial?.priority != null || initial?.category || initial?.subject)
  );
  const [creating, setCreating] = useState<'category' | 'subject' | null>(null);
  // Options created in this session, so they render as selectable chips
  // immediately (they become "existing" once a task is saved with them).
  const [extraCategories, setExtraCategories] = useState<NamedColor[]>([]);
  const [extraSubjects, setExtraSubjects] = useState<NamedColor[]>([]);

  // Existing categories/subjects, data-driven from the user's real tasks.
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
    for (const extra of extraCategories) if (!cats.has(extra.name)) cats.set(extra.name, extra.color);
    for (const extra of extraSubjects) if (!subs.has(extra.name)) subs.set(extra.name, extra.color);
    return {
      categories: [...cats].map(([name, color]) => ({ name, color })),
      subjects: [...subs].map(([name, color]) => ({ name, color })),
    };
  }, [tasks, extraCategories, extraSubjects]);

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
    onSubmit({
      title: trimmed,
      dueDate,
      description: description.trim(),
      priority,
      category,
      subject,
    });
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
        const base = current ?? endOfToday();
        const next = new Date(base);
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
      {/* Tap outside to cancel — the ONLY way to dismiss besides submit. */}
      <Pressable style={styles.backdropTouch} onPress={close} accessibilityLabel="Close" />
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
            autoFocus={autoFocusTitle}
            // Done only dismisses the keyboard; submitting is the button's job.
            returnKeyType="done"
          />

          <View style={[styles.chipRow, { gap: space.s2, marginTop: space.s3 }]}>
            {dueDate ? (
              <>
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
                <Pressable
                  onPress={() => {
                    setPicker(null);
                    setDueDate(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Remove due date"
                  style={chipStyle}>
                  <Text style={{ fontSize: 13, color: colors.textTertiary }}>✕</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={() => {
                  setDueDate(endOfToday());
                  setPicker('date');
                }}
                accessibilityRole="button"
                accessibilityLabel="Add due date"
                style={chipStyle}>
                <Text style={{ fontFamily: monoFont, fontSize: 13, color: colors.textSecondary }}>
                  Add date
                </Text>
              </Pressable>
            )}
          </View>

          {Platform.OS === 'ios' ? (
            <Animated.View style={pickerContainerStyle}>
              {renderedPicker && (
                <DateTimePicker
                  value={dueDate ?? endOfToday()}
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
                value={dueDate ?? endOfToday()}
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

          <CollapsibleReveal open={detailsOpen}>
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
                <SelectChip
                  label="＋ New"
                  selected={creating === 'category'}
                  onPress={() => setCreating(creating === 'category' ? null : 'category')}
                />
              </View>
              {creating === 'category' && (
                <NewOptionCreator
                  placeholder="New category name"
                  onCreate={(option) => {
                    setExtraCategories((prev) => [...prev, option]);
                    setCategory(option);
                    setCreating(null);
                  }}
                />
              )}

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
                <SelectChip
                  label="＋ New"
                  selected={creating === 'subject'}
                  onPress={() => setCreating(creating === 'subject' ? null : 'subject')}
                />
              </View>
              {creating === 'subject' && (
                <NewOptionCreator
                  placeholder="New subject name"
                  onCreate={(option) => {
                    setExtraSubjects((prev) => [...prev, option]);
                    setSubject(option);
                    setCreating(null);
                  }}
                />
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
          </CollapsibleReveal>
        </ScrollView>

        <Pressable
          onPress={submit}
          disabled={!title.trim()}
          accessibilityRole="button"
          accessibilityLabel={submitLabel}
          style={({ pressed }) => [
            styles.submitButton,
            {
              backgroundColor: colors.accent,
              borderRadius: radius.button,
              marginTop: space.s4,
              opacity: !title.trim() ? 0.3 : pressed ? 0.85 : 1,
            },
          ]}>
          <Text style={[type.body, { color: colors.textOnAccent, fontWeight: '600' }]}>{submitLabel}</Text>
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
    alignItems: 'center',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
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
  submitButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
