// The classifier decides between "drop this op forever" and "retry" — the
// original /^(23|42)/ version missed 22001 (value too long), which jammed
// the upload queue permanently behind one oversized field.
import { isPermanentRejection } from '../permanent-errors';

describe('isPermanentRejection', () => {
  it.each([
    ['23505', 'unique violation'],
    ['23503', 'foreign key violation'],
    ['42501', 'RLS denial'],
    ['428C9', 'GENERATED ALWAYS identity rejection'],
    ['22001', 'string too long'],
    ['22P02', 'invalid text representation'],
  ])('drops %s (%s)', (code) => {
    expect(isPermanentRejection({ code })).toBe(true);
  });

  it.each<[string | undefined, string]>([
    [undefined, 'no code (network failure)'],
    ['', 'empty code'],
    ['PGRST301', 'PostgREST transport error'],
    ['08006', 'connection failure'],
    ['57014', 'query cancelled'],
  ])('retries when code is %s (%s)', (code) => {
    expect(isPermanentRejection(code === undefined ? new Error('offline') : { code })).toBe(false);
  });

  it('handles non-object errors without throwing', () => {
    expect(isPermanentRejection(null)).toBe(false);
    expect(isPermanentRejection('boom')).toBe(false);
    expect(isPermanentRejection(42)).toBe(false);
  });
});
