// Live PowerSync status for the sync-state indicator (docs/design/02).
// Returns null in online mode (Expo Go / no PowerSync configured) — the
// indicator simply doesn't render there.
import { useEffect, useState } from 'react';
import type { SyncStatus } from '@powersync/react-native'; // type-only: erased at runtime

import { initSync, syncDb } from '@/lib/sync/system';

export type SyncState = {
  connected: boolean;
  busy: boolean;
  lastSyncedAt: Date | null;
};

export function useSyncStatus(): SyncState | null {
  const [state, setState] = useState<SyncState | null>(null);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;

    (async () => {
      // initSync catches internally and resolves false, but a defensive
      // catch keeps a future refactor from turning this into an unhandled
      // rejection that silently masks sync failures as "online mode".
      const ready = await initSync().catch((error) => {
        console.warn('useSyncStatus: initSync failed', error);
        return false;
      });
      if (!ready || cancelled) return;
      const db = syncDb();
      if (!db) return;

      const apply = (status: SyncStatus) =>
        setState({
          connected: status.connected,
          busy: Boolean(status.dataFlowStatus.downloading || status.dataFlowStatus.uploading),
          lastSyncedAt: status.lastSyncedAt ?? null,
        });

      apply(db.currentStatus);
      dispose = db.registerListener({ statusChanged: apply });
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return state;
}
