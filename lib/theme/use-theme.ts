// The theme hook every designed component uses. For now the theme follows the
// system light/dark setting; when user-selectable themes land (a MUST from the
// handoff), this becomes a provider with a persisted preference — components
// won't change, because they only ever see the tokens.
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, monoFont, motion, radius, space, type, type ThemeColors } from './tokens';

export type Theme = {
  colors: ThemeColors;
  isDark: boolean;
  space: typeof space;
  radius: typeof radius;
  type: typeof type;
  motion: typeof motion;
  monoFont: typeof monoFont;
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    colors: isDark ? darkColors : lightColors,
    isDark,
    space,
    radius,
    type,
    motion,
    monoFont,
  };
}
