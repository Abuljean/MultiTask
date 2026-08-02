import { localDateKey, weekDates } from '../calendar';

describe('weekDates', () => {
  it('returns Sunday through Saturday of the anchor week', () => {
    // 2026-08-02 is a Sunday.
    const week = weekDates(new Date('2026-08-05T15:30:00'));
    expect(week).toHaveLength(7);
    expect(localDateKey(week[0])).toBe('2026-08-02');
    expect(localDateKey(week[6])).toBe('2026-08-08');
    expect(week.every((d) => d.getHours() === 0)).toBe(true);
  });

  it('offsets whole weeks and crosses month boundaries', () => {
    const next = weekDates(new Date('2026-08-05T00:00:00'), 1);
    expect(localDateKey(next[0])).toBe('2026-08-09');
    const prev = weekDates(new Date('2026-08-05T00:00:00'), -1);
    expect(localDateKey(prev[0])).toBe('2026-07-26');
    expect(localDateKey(prev[6])).toBe('2026-08-01');
  });
});
