// Pure classifier for sync-upload errors — split out of connector.ts so it
// can be unit-tested (the connector itself imports native PowerSync modules
// jest can't resolve).
//
// SQLSTATE classes that will NEVER succeed on retry:
//   22 data exception (e.g. 22001 value too long)
//   23 integrity violation (unique/FK/check)
//   42 access rule violation (RLS denial 42501, undefined column, 428C9)
// Anything else (no code = network failure, 5xx, PostgREST transport) is
// transient and must be retried.
const PERMANENT_SQLSTATE = /^(22|23|42)/;

export function isPermanentRejection(error: unknown): boolean {
  const code = (error as { code?: string })?.code ?? '';
  return PERMANENT_SQLSTATE.test(code);
}
