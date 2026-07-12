// Resolved scheme honoring the user's light/dark toggle (falls back to the
// system setting until they touch it). Everything that asks "which scheme?"
// goes through here so the toggle applies app-wide.
export { useResolvedScheme as useColorScheme } from '@/lib/theme/use-theme';
