// Style for the WEB date/time picker inputs, kept as a pure function so the
// unit test can enforce its one hard rule: LONGHAND PROPERTIES ONLY.
// react-native-web's style resolver silently drops CSS shorthand strings
// ('padding: 0 12px', 'border: 1px solid …') — that bug shipped once and left
// the inputs with zero padding, value and icon jammed against the edges.
import { space, type ThemeColors } from '@/lib/theme/tokens';

export function pickerInputStyle(colors: ThemeColors, buttonRadius: number) {
  return {
    height: 44,
    paddingLeft: space.s4,
    paddingRight: space.s4,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: colors.borderSubtle,
    borderRadius: buttonRadius,
    // Lets the browser draw the native picker chrome (calendar icon etc.)
    // in whichever scheme is active — passed through to CSS color-scheme.
    colorScheme: 'light dark',
    width: '100%' as const,
    boxSizing: 'border-box' as const,
  };
}
