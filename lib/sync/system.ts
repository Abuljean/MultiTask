// The sync system's front door — and the ONLY sync file safe to import
// anywhere. Everything native (PowerSync, op-sqlite, the schema, the
// connector) loads through dynamic import() inside initSync(), which only
// runs outside Expo Go with a configured PowerSync URL. Consequences:
//   - In Expo Go: syncDb() stays null, every data hook takes its original
//     online Supabase path — the app works exactly as before.
//   - In the dev build with EXPO_PUBLIC_POWERSYNC_URL set: hooks read/write
//     the local SQLite database (instant, offline-capable) and PowerSync
//     moves data in the background.
import Constants from 'expo-constants';
import type { AbstractPowerSyncDatabase } from '@powersync/react-native';

export const isExpoGo = Constants.appOwnership === 'expo';

let db: AbstractPowerSyncDatabase | null = null;
let initPromise: Promise<boolean> | null = null;

/** The local database when sync mode is active, else null. Hooks branch on
 *  this at call time, so the switch is transparent to screens. */
export function syncDb(): AbstractPowerSyncDatabase | null {
  return db;
}

export function syncAvailable(): boolean {
  return !isExpoGo && Boolean(process.env.EXPO_PUBLIC_POWERSYNC_URL);
}

export function initSync(): Promise<boolean> {
  if (!initPromise) {
    initPromise = doInit();
  }
  return initPromise;
}

async function doInit(): Promise<boolean> {
  if (!syncAvailable()) return false;
  try {
    const [{ PowerSyncDatabase }, { OPSqliteOpenFactory }, { AppSchema }, { SupabaseConnector }] =
      await Promise.all([
        import('@powersync/react-native'),
        import('@powersync/op-sqlite'),
        import('./schema'),
        import('./connector'),
      ]);

    const factory = new OPSqliteOpenFactory({ dbFilename: 'multitask.db' });
    const instance = new PowerSyncDatabase({ schema: AppSchema, database: factory });
    await instance.init();
    // connect() keeps retrying in the background; offline at launch is fine —
    // local reads/writes work immediately, sync catches up later.
    instance.connect(new SupabaseConnector());
    db = instance;
    return true;
  } catch (error) {
    console.warn('PowerSync init failed; staying in online mode', error);
    return false;
  }
}

/** Placeholder list builder for IN (...) clauses. */
export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(',');
}
