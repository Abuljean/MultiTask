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

import { DEFAULT_PACK_ID, getPack, STYLE_PACKS, type StylePack } from '@/lib/style-packs/registry';
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
const PACK_STORAGE_KEY = 'ui.stylePack';

type ThemePreferenceValue = {
  resolved: 'light' | 'dark';
  toggle: () => void;
  /** Active style pack — always one of the curated STYLE_PACKS (any stored
   *  id that isn't in the registry falls back to the default, so a removed
   *  pack can never wedge the app). */
  packId: string;
  setPackId: (id: string) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [packId, setPackIdState] = useState<string>(DEFAULT_PACK_ID);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') setPreference(stored);
    });
    AsyncStorage.getItem(PACK_STORAGE_KEY).then((stored) => {
      if (stored) setPackIdState(getPack(stored).id);
    });
  }, []);

  const resolved: 'light' | 'dark' =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemePreferenceValue>(
    () => ({
      resolved,
      // Both setters are optimistic writes: apply to state first, and if the
      // persistence write fails, roll the state back (app-wide mutation rule —
      // a silent failure would show the new look now, then lose it on relaunch).
      toggle: () => {
        const previous = preference;
        const next = resolved === 'dark' ? 'light' : 'dark';
        setPreference(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
          setPreference((current) => (current === next ? previous : current));
        });
      },
      packId,
      setPackId: (id: string) => {
        const previous = packId;
        const valid = getPack(id).id;
        setPackIdState(valid);
        AsyncStorage.setItem(PACK_STORAGE_KEY, valid).catch(() => {
          setPackIdState((current) => (current === valid ? previous : current));
        });
      },
    }),
    [resolved, preference, packId]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

/** The curated style-pack list + the active selection (Settings → Styles). */
export function useStylePacks(): {
  packs: StylePack[];
  activeId: string;
  setActive: (id: string) => void;
} {
  const context = useContext(ThemePreferenceContext);
  return {
    packs: STYLE_PACKS,
    activeId: context?.packId ?? DEFAULT_PACK_ID,
    setActive: context?.setPackId ?? (() => {}),
  };
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
  const context = useContext(ThemePreferenceContext);
  const pack = getPack(context?.packId);

  // Pack colors merge OVER the base palette — a pack can restyle one token
  // or every token, per mode, and everything downstream just re-renders.
  // (This is the style-pack seam: docs/design/09/10.)
  const colors = useMemo<ThemeColors>(() => {
    const base = isDark ? darkColors : lightColors;
    const overrides = isDark ? pack.colors?.dark : pack.colors?.light;
    return overrides ? { ...base, ...overrides } : base;
  }, [isDark, pack]);

  return {
    colors,
    isDark,
    space,
    radius,
    type,
    motion,
    monoFont,
  };
}
