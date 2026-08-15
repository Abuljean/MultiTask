// Boots the sync system (no-op in Expo Go) and bridges local database
// changes into TanStack Query: when PowerSync applies rows that arrived
// from the server, the affected query keys invalidate and screens refresh.
// Local writes already invalidate through the mutations themselves.
//
// Also owns the auth lifecycle of local data (2026-07-15 audit):
//   SIGNED_OUT → wipe the local database (teardownSync), clear the query
//     cache, disarm notifications. Without this, the next account on the
//     device reads the previous user's rows, and the previous user's queued
//     offline writes replay under the new JWT (RLS rejects → dropped).
//   SIGNED_IN → reconnect immediately (skip PowerSync's retry backoff) and
//     restart the watch streams.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { clearTaskNotifications } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { clearSpotlightIndex } from '@/lib/native/system';
import { initSync, reconnectSync, syncDb, teardownSync } from '@/lib/sync/system';
import { captureError } from '@/lib/telemetry/system';

const TABLE_KEYS: [string, string][] = [
  ['task', 'tasks'],
  ['recurring_task', 'recurring'],
  ['recurring_completion', 'recurring'],
  ['event', 'events'],
];

export function SyncBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let aborter = new AbortController();

    // A wifi drop puts PowerSync into retry BACKOFF — when the network
    // returns it can sit "offline" for a long while with nothing nudging it
    // (developer report 2026-08-11: "says offline even though there is
    // wifi"). Foregrounding the app is the natural moment to short-circuit
    // the backoff and reconnect immediately.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reconnectSync();
    });

    const boot = async (signal: AbortSignal) => {
      const ready = await initSync();
      if (!ready || signal.aborted) return;
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
            signal,
          })) {
            queryClient.invalidateQueries({ queryKey: [key] });
          }
        })().catch((error) => {
          // Aborted streams end silently; anything else means the bridge is
          // dead and screens would silently go stale — leave a trace.
          if (!signal.aborted) {
            console.warn(`Sync watch for ${table} ended unexpectedly`, error);
            // A dead bridge = screens silently stale (rubric #8) — report it.
            captureError(error, { where: 'sync-bridge-watch', table });
          }
        });
      }
    };

    void boot(aborter.signal);

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        aborter.abort();
        void clearTaskNotifications();
        // System search must not keep offering the signed-out user's tasks.
        void clearSpotlightIndex();
        void teardownSync().finally(() => {
          queryClient.clear();
        });
      } else if (event === 'SIGNED_IN') {
        // Restart watches against the (possibly re-created) database and
        // skip the connection retry backoff accumulated while signed out.
        aborter.abort();
        aborter = new AbortController();
        reconnectSync();
        void boot(aborter.signal);
      }
    });

    return () => {
      aborter.abort();
      appStateSub.remove();
      authSub.subscription.unsubscribe();
    };
  }, [queryClient]);

  return null;
}
