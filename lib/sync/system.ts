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
import type { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from '@powersync/react-native';

export const isExpoGo = Constants.appOwnership === 'expo';

let db: AbstractPowerSyncDatabase | null = null;
// The created instance, possibly still pre-first-sync (db stays null until
// the local data is trustworthy). Kept so reconnectSync can nudge it.
let instance: AbstractPowerSyncDatabase | null = null;
let connector: PowerSyncBackendConnector | null = null;
let initPromise: Promise<boolean> | null = null;
// Set during doInit from the dynamically-imported connector module, so
// callers (Settings, the dropped-op toast) never import connector directly —
// that would drag PowerSync into bundles that must not contain it.
let droppedCounter: (() => number) | null = null;

/** How many queued offline changes were permanently dropped (RLS/constraint
 *  rejections). 0 whenever sync isn't running. */
export function droppedOpCount(): number {
  return droppedCounter ? droppedCounter() : 0;
}

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
    const [{ PowerSyncDatabase }, { OPSqliteOpenFactory }, { AppSchema }, connectorModule] =
      await Promise.all([
        import('@powersync/react-native'),
        import('@powersync/op-sqlite'),
        import('./schema'),
        import('./connector'),
      ]);
    const { SupabaseConnector } = connectorModule;
    droppedCounter = connectorModule.getDroppedOpCount;

    const factory = new OPSqliteOpenFactory({ dbFilename: 'multitask.db' });
    const created = new PowerSyncDatabase({ schema: AppSchema, database: factory });
    await created.init();
    // connect() keeps retrying in the background; offline at launch is fine —
    // local reads/writes work immediately, sync catches up later.
    connector = new SupabaseConnector();
    instance = created;
    created.connect(connector);
    // Don't hand the hooks an EMPTY local database on a fresh install — that
    // renders as "no tasks" (an empty state, not a loading state) until the
    // first checkpoint lands. waitForFirstSync resolves instantly on any
    // device that has synced before; until it resolves, hooks keep taking
    // the online REST path.
    await created.waitForFirstSync();
    db = created;
    return true;
  } catch (error) {
    // Reset the partial state: leaving instance/connector populated would
    // make reconnectSync() nudge a half-initialized database instead of
    // triggering a clean re-init.
    instance = null;
    connector = null;
    droppedCounter = null;
    console.warn('PowerSync init failed; staying in online mode', error);
    return false;
  }
}

/** Sign-out teardown: stop syncing and WIPE the local database. Without this
 *  the next account on this device would read the previous user's rows, and
 *  the previous user's queued offline writes would replay under the new JWT
 *  (RLS rejects them → permanently dropped = silent data loss). */
export async function teardownSync(): Promise<void> {
  const current = instance;
  instance = null;
  connector = null;
  db = null;
  initPromise = null;
  // Without this, droppedOpCount() reports the PREVIOUS session's drops
  // after sign-out/account switch instead of the documented 0.
  droppedCounter = null;
  if (current) {
    try {
      await current.disconnectAndClear();
      await current.close();
    } catch (error) {
      console.warn('Sync teardown failed', error);
    }
  }
}

/** Sign-in nudge: reconnect immediately instead of waiting out the retry
 *  backoff PowerSync entered while we were signed out. If sync was torn
 *  down (or never started), initSync boots it fresh. */
export function reconnectSync(): void {
  if (instance && connector) {
    try {
      instance.connect(connector);
    } catch (error) {
      console.warn('Sync reconnect failed', error);
    }
  } else {
    void initSync();
  }
}

/** Placeholder list builder for IN (...) clauses. */
export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(',');
}
