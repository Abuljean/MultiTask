// The widget data bridge — the ONLY file that touches @bacons/apple-targets'
// ExtensionStorage (App Group UserDefaults). Same soft-fail gateway pattern
// as lib/sync/system.ts: dynamic import + try/catch, so the currently
// installed build (whose binary lacks the native module) just reports false
// and the app runs on. iOS-only by nature.
import { Platform } from 'react-native';

export const APP_GROUP = 'group.com.abuljean.multitask';
const SNAPSHOT_KEY = 'widget.snapshot';
const PENDING_KEY = 'widget.pendingCompletions';

export async function writeWidgetSnapshot(payload: unknown): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const { ExtensionStorage } = await import('@bacons/apple-targets');
    const storage = new ExtensionStorage(APP_GROUP);
    storage.set(SNAPSHOT_KEY, JSON.stringify(payload));
    ExtensionStorage.reloadWidget();
    return true;
  } catch {
    return false;
  }
}

/** Task ids the widget's Complete button queued while the app was away.
 *  Read-and-clear; the caller runs them through the normal mutation path. */
export async function drainPendingCompletions(): Promise<number[]> {
  if (Platform.OS !== 'ios') return [];
  try {
    const { ExtensionStorage } = await import('@bacons/apple-targets');
    const storage = new ExtensionStorage(APP_GROUP);
    const raw = await Promise.resolve(storage.get(PENDING_KEY) as unknown);
    storage.remove(PENDING_KEY);
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(list)) return [];
    return list.filter((v): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0);
  } catch {
    return [];
  }
}
