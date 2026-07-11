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

    try {
      for (const op of transaction.crud) {
        const table = supabase.from(op.table);
        const pk = PK_COLUMN[op.table] ?? 'id';
        const id = pkValue(op.table, op.id);

        if (op.op === UpdateType.PUT) {
          const { error } = await table.upsert({ ...op.opData, [pk]: id });
          if (error) throw error;
        } else if (op.op === UpdateType.PATCH) {
          const { error } = await table.update(op.opData ?? {}).eq(pk, id);
          if (error) throw error;
        } else if (op.op === UpdateType.DELETE) {
          const { error } = await table.delete().eq(pk, id);
          if (error) throw error;
        }
      }
      await transaction.complete();
    } catch (error: unknown) {
      // Permanent rejections (RLS denial, constraint violation) must NOT
      // retry forever — complete the transaction to drop the poisoned op.
      // Transient errors (offline, timeouts) rethrow so PowerSync retries.
      const code = (error as { code?: string })?.code ?? '';
      if (/^(23|42)/.test(code)) {
        console.warn('Dropping permanently rejected sync op', code);
        await transaction.complete();
        return;
      }
      throw error;
    }
  }
}
