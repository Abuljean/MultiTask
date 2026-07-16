// The PowerSync ↔ Supabase backend connector.
// - fetchCredentials: PowerSync accepts the Supabase JWT directly (enable
//   "Supabase auth" on the PowerSync instance), so the sync service applies
//   the same per-user bucket the sync rules define.
// - uploadData: local writes queue as CRUD transactions; this replays them
//   against Supabase over the normal REST API, so RLS stays the enforcement
//   point for writes exactly as before.
// Only imported dynamically from lib/sync/system.ts (never in Expo Go).
import {
  UpdateType,
  type AbstractPowerSyncDatabase,
  type PowerSyncBackendConnector,
} from '@powersync/react-native';

import { supabase } from '@/lib/supabase';
import { isPermanentRejection } from '@/lib/sync/permanent-errors';

// Postgres primary-key column per table (the client `id` maps onto it).
const PK_COLUMN: Record<string, string> = {
  task: 'task_id',
  recurring_task: 'id',
  recurring_completion: 'id',
  event: 'id',
};

// bigint-keyed tables need numeric ids server-side; recurring_completion is uuid.
function pkValue(table: string, id: string): number | string {
  return table === 'recurring_completion' ? id : Number(id);
}

// Ops dropped as permanently rejected — food for the future sync-state
// indicator (docs/design/02). Module-level so UI can poll it cheaply.
let droppedOpCount = 0;
export function getDroppedOpCount(): number {
  return droppedOpCount;
}

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) return null;
    const endpoint = process.env.EXPO_PUBLIC_POWERSYNC_URL;
    if (!endpoint) return null;
    return {
      endpoint,
      token: session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    // Per-op error handling: a permanently rejected op is dropped ALONE —
    // the rest of the transaction still applies (previously one poisoned op
    // discarded every op after it, e.g. one bad CSV row killed the whole
    // import). Transient errors rethrow so PowerSync retries the whole
    // transaction; replaying already-applied ops is safe (a duplicate insert
    // fails 23505 → dropped as permanent, updates/deletes are idempotent).
    for (const op of transaction.crud) {
      const table = supabase.from(op.table);
      const pk = PK_COLUMN[op.table] ?? 'id';
      const id = pkValue(op.table, op.id);

      try {
        if (op.op === UpdateType.PUT) {
          const { error } = await table.upsert({ ...op.opData, [pk]: id });
          if (error) throw error;
        } else if (op.op === UpdateType.PATCH) {
          // An empty PATCH would 4xx forever and jam the queue — skip it.
          if (!op.opData || Object.keys(op.opData).length === 0) continue;
          const { error } = await table.update(op.opData).eq(pk, id);
          if (error) throw error;
        } else if (op.op === UpdateType.DELETE) {
          const { error } = await table.delete().eq(pk, id);
          if (error) throw error;
        }
      } catch (error: unknown) {
        if (isPermanentRejection(error)) {
          droppedOpCount += 1;
          console.warn(
            'Dropping permanently rejected sync op',
            op.table,
            op.op,
            (error as { code?: string })?.code
          );
          continue;
        }
        throw error;
      }
    }
    await transaction.complete();
  }
}
