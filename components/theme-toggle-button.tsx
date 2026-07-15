// The quick light/dark toggle (developer request 2026-07-11): lives in the
// top-right corner of every tab so switching never requires a trip into
// Settings. Explicit choice persists per device (see lib/theme/use-theme).
import { Pressable } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme, useThemeToggle } from '@/lib/theme/use-theme';

export function ThemeToggleButton() {
  const { colors, isDark } = useTheme();
  const toggleTheme = useThemeToggle();
  return (
    <Pressable
      onPress={toggleTheme}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconSymbol name={isDark ? 'sun.max.fill' : 'moon.fill'} size={24} color={colors.textSecondary} />
    </Pressable>
  );
}
