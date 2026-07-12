// Web variant — same as native now: the resolved scheme honoring the user's
// toggle. (The old hydration dance existed for static rendering; the app
// ships as an SPA — web.output "single" — so there is no server pass.)
export { useResolvedScheme as useColorScheme } from '@/lib/theme/use-theme';
