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
      const ready = await initSync();
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
