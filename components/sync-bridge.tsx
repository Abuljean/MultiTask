// Boots the sync system (no-op in Expo Go) and bridges local database
// changes into TanStack Query: when PowerSync applies rows that arrived
// from the server, the affected query keys invalidate and screens refresh.
// Local writes already invalidate through the mutations themselves.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { initSync, syncDb } from '@/lib/sync/system';

const TABLE_KEYS: [string, string][] = [
  ['task', 'tasks'],
  ['recurring_task', 'recurring'],
  ['recurring_completion', 'recurring'],
  ['event', 'events'],
];

export function SyncBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const aborter = new AbortController();

    (async () => {
      const ready = await initSync();
      if (!ready || aborter.signal.aborted) return;
      const db = syncDb();
      if (!db) return;

      // Local data just became the source of truth — refresh everything.
      queryClient.invalidateQueries();

      for (const [table, key] of TABLE_KEYS) {
        (async () => {
          // watch() emits whenever the underlying table changes (including
          // changes applied by the sync service).
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          for await (const _emission of db.watch(`SELECT count(*) AS n FROM ${table}`, [], {
            signal: aborter.signal,
          })) {
            queryClient.invalidateQueries({ queryKey: [key] });
          }
        })().catch(() => {
          // Watch streams end when aborted; nothing to do.
        });
      }
    })();

    return () => aborter.abort();
  }, [queryClient]);

  return null;
}
