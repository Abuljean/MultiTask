// The theme hook every designed component uses — and, since the light/dark
// toggle landed (2026-07-11), the provider that owns the user's preference.
// Components only ever see the tokens, so nothing else changed when this
// became user-selectable (exactly the promise the original comment made).
//
// Preference model: 'system' until the user touches the toggle, then an
// explicit 'light'/'dark' persisted per device (AsyncStorage — theme is a
// device-appropriate setting, not an account one: dark on the phone and
// light on a sunlit desktop is a fine combination).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
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

type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'ui.themePreference';

type ThemePreferenceValue = {
  resolved: 'light' | 'dark';
  toggle: () => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') setPreference(stored);
    });
  }, []);

  const resolved: 'light' | 'dark' =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemePreferenceValue>(
    () => ({
      resolved,
      toggle: () => {
        const next = resolved === 'dark' ? 'light' : 'dark';
        setPreference(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      },
    }),
    [resolved]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

/** The resolved scheme ('light' | 'dark') honoring the user's toggle.
 *  Falls back to the system scheme outside the provider (tests). */
export function useResolvedScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const context = useContext(ThemePreferenceContext);
  if (context) return context.resolved;
  return system === 'dark' ? 'dark' : 'light';
}

/** The light/dark toggle for the header button. */
export function useThemeToggle(): () => void {
  const context = useContext(ThemePreferenceContext);
  return context?.toggle ?? (() => {});
}

export function useTheme(): Theme {
  const isDark = useResolvedScheme() === 'dark';
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
