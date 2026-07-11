import { csvToEvents, parseCsv } from '../csv';

describe('parseCsv', () => {
  test('handles quoted fields with commas, escaped quotes, and CRLF', () => {
    const rows = parseCsv('a,"b, with comma","say ""hi"""\r\nc,d,e\n');
    expect(rows).toEqual([
      ['a', 'b, with comma', 'say "hi"'],
      ['c', 'd', 'e'],
    ]);
  });

  test('skips fully empty lines', () => {
    expect(parseCsv('a,b\n\n\nc,d\n')).toHaveLength(2);
  });
});

describe('csvToEvents', () => {
  test('maps fuzzy headers, ISO dates, AM/PM times', () => {
    const { events, errors } = csvToEvents(
      'Event, Date, Start Time, End Time, Location\nMath class,2026-09-01,9:00 AM,10:30 AM,Room 12\n'
    );
    expect(errors).toEqual([]);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Math class');
    expect(events[0].start.getHours()).toBe(9);
    expect(events[0].end?.getHours()).toBe(10);
    expect(events[0].end?.getMinutes()).toBe(30);
    expect(events[0].allDay).toBe(false);
    expect(events[0].location).toBe('Room 12');
  });

  test('US slash dates and 24h times work; no time means all-day', () => {
    const { events, errors } = csvToEvents(
      'title,date,time\nLecture,9/1/2026,14:15\nHoliday,9/2/2026,\n'
    );
    expect(errors).toEqual([]);
    expect(events[0].start.getMonth()).toBe(8); // September (month-first)
    expect(events[0].start.getHours()).toBe(14);
    expect(events[1].allDay).toBe(true);
    expect(events[1].start.getHours()).toBe(0);
  });

  test('bad rows are collected as errors, good rows still import', () => {
    const { events, errors } = csvToEvents(
      'title,date\nGood,2026-09-01\n,2026-09-02\nBad date,tomorrow\n'
    );
    expect(events).toHaveLength(1);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain('Row 3');
    expect(errors[1]).toContain('Row 4');
  });

  test('missing required columns fails clearly', () => {
    const { events, errors } = csvToEvents('name,place\nX,Y\n');
    expect(events).toHaveLength(0);
    expect(errors[0]).toContain('date');
  });

  test('end time earlier than start is dropped, 12 AM/PM edge cases', () => {
    const { events } = csvToEvents(
      'title,date,start,end\nWeird,2026-09-01,3:00 PM,2:00 PM\nMidnight,2026-09-02,12:00 AM,\nNoon,2026-09-03,12:00 PM,\n'
    );
    expect(events[0].end).toBeNull();
    expect(events[1].start.getHours()).toBe(0);
    expect(events[2].start.getHours()).toBe(12);
  });
});
