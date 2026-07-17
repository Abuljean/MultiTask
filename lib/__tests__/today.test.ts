import { msUntilNextMidnight, startOfDay } from '../today';

describe('startOfDay', () => {
  it('zeroes the time components', () => {
    const d = startOfDay(new Date('2026-07-17T15:42:33.123'));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(17);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  it('does not mutate its input', () => {
    const input = new Date('2026-07-17T15:00:00');
    startOfDay(input);
    expect(input.getHours()).toBe(15);
  });
});

describe('msUntilNextMidnight', () => {
  it('measures to the next local midnight', () => {
    const ms = msUntilNextMidnight(new Date('2026-07-17T23:00:00'));
    expect(ms).toBe(60 * 60 * 1000);
  });

  it('is a full day at exact midnight', () => {
    const ms = msUntilNextMidnight(new Date('2026-07-17T00:00:00'));
    expect(ms).toBe(24 * 60 * 60 * 1000);
  });
});
