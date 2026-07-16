// The device-calendar front door — the ONLY file that touches expo-calendar
// (same guard pattern as lib/sync/system.ts). The module loads via dynamic
// import and is probed with a harmless native call: in a build whose binary
// predates expo-calendar the JS import still resolves, and it's the CALL that
// throws. Everything fails soft to null — the feature reports "unavailable"
// and the app keeps running until the developer installs the new build.
import { Platform } from 'react-native';

type CalendarModule = typeof import('expo-calendar');

let cached: CalendarModule | null | undefined;

export async function calendarModule(): Promise<CalendarModule | null> {
  if (Platform.OS === 'web') return null;
  if (cached !== undefined) return cached;
  try {
    const mod = await import('expo-calendar');
    await mod.getCalendarPermissionsAsync(); // probe: throws when native side is absent
    cached = mod;
  } catch {
    cached = null;
  }
  return cached;
}

export type CalendarPermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export async function getCalendarPermissionState(): Promise<CalendarPermissionState> {
  const mod = await calendarModule();
  if (!mod) return 'unavailable';
  try {
    const current = await mod.getCalendarPermissionsAsync();
    if (current.granted) return 'granted';
    return current.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/** Ask the system for calendar access. Only called on explicit user intent
 *  (the Settings toggle) — background reconciles never prompt. */
export async function requestCalendarAccess(): Promise<boolean> {
  const mod = await calendarModule();
  if (!mod) return false;
  try {
    const current = await mod.getCalendarPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const requested = await mod.requestCalendarPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}
