// WEB stub of the sync system front door. Metro resolves this file instead
// of system.ts when bundling for web, keeping the native PowerSync/op-sqlite
// modules (which can't exist in a browser) out of the web bundle entirely.
// Web therefore runs in online mode for now; the desktop/web phase
// (docs/design/08) swaps this for the PowerSync WEB SDK (wa-sqlite), which
// slots in behind the exact same exports.
import type { AbstractPowerSyncDatabase } from '@powersync/react-native'; // type-only: erased

export const isExpoGo = false;

export function syncDb(): AbstractPowerSyncDatabase | null {
  return null;
}

export function syncAvailable(): boolean {
  return false;
}

export async function initSync(): Promise<boolean> {
  return false;
}

export async function teardownSync(): Promise<void> {}

export function reconnectSync(): void {}

export function droppedOpCount(): number {
  return 0;
}

/** Placeholder list builder for IN (...) clauses. */
export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(',');
}
