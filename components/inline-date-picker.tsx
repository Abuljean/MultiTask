// Platform-resolved date/time picker used inside the task form.
// NATIVE version: wraps @react-native-community/datetimepicker (inline
// calendar / minute wheel on iOS, system dialogs on Android — the behavior
// the developer tuned). The .web.tsx sibling renders HTML inputs instead;
// Metro picks the right file per platform.
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

import { useTheme } from '@/lib/theme/use-theme';

export type InlineDatePickerProps = {
  mode: 'date' | 'time';
  value: Date;
  /** dismissed = the platform dialog was cancelled (Android). */
  onChange: (selected: Date | null, dismissed: boolean) => void;
};

export function InlineDatePicker({ mode, value, onChange }: InlineDatePickerProps) {
  const { colors, isDark } = useTheme();
  return (
    <DateTimePicker
      value={value}
      mode={mode}
      display={Platform.OS === 'ios' ? (mode === 'date' ? 'inline' : 'spinner') : 'default'}
      onChange={(event: DateTimePickerEvent, selected?: Date) => {
        if (event.type === 'dismissed') onChange(null, true);
        else onChange(selected ?? null, false);
      }}
      accentColor={colors.accent}
      themeVariant={isDark ? 'dark' : 'light'}
    />
  );
}
