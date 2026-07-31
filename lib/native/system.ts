// Guarded gateway to the local native module (Spotlight indexing) — same
// soft-fail pattern as lib/sync/system.ts: requireNativeModule throws when
// the installed binary lacks the module, so even the import stays dynamic.
// iOS-only by nature.
import { Platform } from 'react-native';

import type { SpotlightTask } from '@/modules/multitask-native';

type NativeModule = typeof import('@/modules/multitask-native').default;

let cached: NativeModule | null | undefined;

async function nativeModule(): Promise<NativeModule | null> {
  if (Platform.OS !== 'ios') return null;
  if (cached !== undefined) return cached;
  try {
    cached = (await import('@/modules/multitask-native')).default;
  } catch {
    cached = null;
  }
  return cached;
}

/** Replace the Spotlight task index (reconcile-style). Soft no-op when the
 *  build lacks the native module. */
export async function indexSpotlightTasks(items: SpotlightTask[]): Promise<boolean> {
  const mod = await nativeModule();
  if (!mod) return false;
  try {
    await mod.indexTasks(items);
    return true;
  } catch {
    return false;
  }
}

/** Sign-out hygiene: remove the previous user's tasks from system search. */
export async function clearSpotlightIndex(): Promise<void> {
  const mod = await nativeModule();
  if (!mod) return;
  try {
    await mod.clearIndex();
  } catch {
    // Nothing to clear or index unavailable — fine.
  }
}
