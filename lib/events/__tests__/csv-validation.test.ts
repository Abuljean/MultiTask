// Guards added in the 2026-07-15 audit: range validation (no silent Date
// rollover), alias priority, and server varchar caps.
import { csvToEvents } from '../csv';

function run(csv: string) {
  return csvToEvents(csv);
}

describe('date range validation', () => {
  it('rejects rolled-over dates like Feb 31 as row errors', () => {
    const { events, errors } = run('title,date\nGhost,2026-02-31');
    expect(events).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it('rejects month 13', () => {
    const { events, errors } = run('title,date\nGhost,13/01/2026');
    expect(events).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it('accepts leap-day Feb 29 in a leap year', () => {
    const { events, errors } = run('title,date\nLeap,2028-02-29');
    expect(errors).toHaveLength(0);
    expect(events[0].start.getDate()).toBe(29);
  });

  it('rejects Feb 29 in a non-leap year', () => {
    const { events } = run('title,date\nNope,2026-02-29');
    expect(events).toHaveLength(0);
  });
});

describe('time range validation', () => {
  it('rejects minute 99 instead of rolling into the next hour', () => {
    const { events, errors } = run('title,date,start time\nBad,2026-07-20,10:99');
    expect(events).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it('rejects "13 PM"', () => {
    const { events } = run('title,date,start time\nBad,2026-07-20,13:00 PM');
    expect(events).toHaveLength(0);
  });

  it('still accepts 12 AM as midnight and 12 PM as noon', () => {
    const { events } = run(
      'title,date,start time\nMidnight,2026-07-20,12:00 AM\nNoon,2026-07-20,12:00 PM'
    );
    expect(events[0].start.getHours()).toBe(0);
    expect(events[1].start.getHours()).toBe(12);
  });
});

describe('column alias priority', () => {
  it('prefers "title" over "subject" regardless of column order', () => {
    const { events } = run('subject,date,title\nMath,2026-07-20,Real title');
    expect(events[0].title).toBe('Real title');
  });
});

describe('server varchar caps', () => {
  it('truncates title to 200 chars', () => {
    const long = 'x'.repeat(300);
    const { events } = run(`title,date\n${long},2026-07-20`);
    expect(events[0].title).toHaveLength(200);
  });

  it('truncates notes to 500 chars', () => {
    const notes = 'n'.repeat(600);
    const { events } = run(`title,date,notes\nEvent,2026-07-20,${notes}`);
    expect(events[0].notes).toHaveLength(500);
  });
});
