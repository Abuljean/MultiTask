// WEB version of the inline date/time picker: native HTML <input type="date">
// / <input type="time"> — the browser's own pickers, which is exactly what
// web users expect. Same props as the native sibling.
import { unstable_createElement } from 'react-native-web';

import { useTheme } from '@/lib/theme/use-theme';
import { pickerInputStyle } from './inline-date-picker-style';
import type { InlineDatePickerProps } from './inline-date-picker';

const pad = (n: number) => String(n).padStart(2, '0');

export function InlineDatePicker({ mode, value, onChange }: InlineDatePickerProps) {
  const { colors, radius } = useTheme();

  const htmlValue =
    mode === 'date'
      ? `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
      : `${pad(value.getHours())}:${pad(value.getMinutes())}`;

  return unstable_createElement('input', {
    type: mode,
    value: htmlValue,
    onChange: (event: { target: { value: string } }) => {
      const raw = event.target.value;
      if (!raw) return;
      const next = new Date(value);
      if (mode === 'date') {
        const [year, month, day] = raw.split('-').map(Number);
        next.setFullYear(year, month - 1, day);
      } else {
        const [hours, minutes] = raw.split(':').map(Number);
        next.setHours(hours, minutes, 0, 0);
      }
      onChange(next, false);
    },
    style: pickerInputStyle(colors, radius.button),
  });
}

export type { InlineDatePickerProps };
