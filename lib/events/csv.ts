// CSV → calendar events (handoff MUST: import creates EVENTS, not tasks;
// the user generates the CSV elsewhere — e.g. asks an AI to make one — so
// the parser is deliberately forgiving about column names and formats).
//
// Recognized columns (fuzzy, case/space-insensitive):
//   title:      title, event, name, subject, summary
//   date:       date, start date, day
//   start time: start time, time, start
//   end time:   end time, end
//   location:   location, place, where
//   notes:      notes, description, details
// Date formats: YYYY-MM-DD or M/D/YYYY (month-first). Time formats: 24h
// HH:mm or h:mm AM/PM. A row with no time becomes an all-day event.

import { EVENT_LOCATION_MAX, EVENT_NOTES_MAX, EVENT_TITLE_MAX } from '@/lib/limits';

export type ParsedEvent = {
  title: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  /** Hex color from the CSV's optional color column; null = use default. */
  color: string | null;
};

/** Friendly color names accepted in the CSV's color column. */
export const NAMED_EVENT_COLORS: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  teal: '#14b8a6',
  blue: '#3b82f6',
  indigo: '#6366f1',
  purple: '#a855f7',
  pink: '#ec4899',
  gray: '#6b7280',
  grey: '#6b7280',
};

/** Hex (#abc or #aabbcc) or a friendly name → normalized hex; else null.
 *  Unrecognized colors are ignored rather than failing the row. */
export function normalizeColor(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (NAMED_EVENT_COLORS[trimmed]) return NAMED_EVENT_COLORS[trimmed];
  const hex6 = /^#?([0-9a-f]{6})$/.exec(trimmed);
  if (hex6) return `#${hex6[1]}`;
  const hex3 = /^#?([0-9a-f]{3})$/.exec(trimmed);
  if (hex3) {
    const [r, g, b] = hex3[1];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

export type CsvImportResult = {
  events: ParsedEvent[];
  /** Human-readable per-row problems (row numbers are 1-based, incl. header). */
  errors: string[];
};

/** Proper CSV split: quoted fields, escaped quotes, commas and newlines
 *  inside quotes. Returns rows of fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim().length > 0));
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z]/g, '');
}

const COLUMN_ALIASES: Record<string, string[]> = {
  title: ['title', 'event', 'name', 'subject', 'summary'],
  date: ['date', 'startdate', 'day'],
  startTime: ['starttime', 'time', 'start'],
  endTime: ['endtime', 'end'],
  location: ['location', 'place', 'where'],
  notes: ['notes', 'description', 'details'],
  color: ['color', 'colour'],
};

function mapColumns(headers: string[]): Record<string, number> {
  // Alias priority wins over header order: a file with both "subject" and
  // "title" columns must map the event title to "title" (the stronger alias),
  // not whichever column happens to come first.
  const normalized = headers.map(normalizeHeader);
  const mapping: Record<string, number> = {};
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const index = normalized.indexOf(alias);
      if (index !== -1) {
        mapping[key] = index;
        break;
      }
    }
  }
  return mapping;
}

function parseDatePart(value: string): { year: number; month: number; day: number } | null {
  let year: number, month: number, day: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  const slash = iso ? null : /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(value);
  if (iso) {
    [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (slash) {
    // Month-first (US-style). Documented in the import sheet.
    [year, month, day] = [Number(slash[3]), Number(slash[1]), Number(slash[2])];
  } else {
    return null;
  }
  // Range-check instead of letting the Date constructor roll over: AI- and
  // hand-made CSVs produce "2026-02-31", which must be a row error, not
  // a silent March 3rd.
  if (month < 1 || month > 12) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return null;
  return { year, month, day };
}

function parseTimePart(value: string): { hour: number; minute: number } | null {
  const ampm = /^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]?\.?$/.exec(value);
  if (ampm) {
    const rawHour = Number(ampm[1]);
    const minute = Number(ampm[2] ?? '0');
    if (rawHour < 1 || rawHour > 12 || minute > 59) return null;
    let hour = rawHour % 12;
    if (/[Pp]/.test(ampm[3])) hour += 12;
    return { hour, minute };
  }
  const h24 = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (h24) {
    const hour = Number(h24[1]);
    const minute = Number(h24[2]);
    if (hour > 23 || minute > 59) return null;
    return { hour, minute };
  }
  return null;
}

export function csvToEvents(text: string): CsvImportResult {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { events: [], errors: ['The file needs a header row and at least one event row.'] };
  }

  const columns = mapColumns(rows[0]);
  if (columns.title === undefined || columns.date === undefined) {
    return {
      events: [],
      errors: ['Could not find "title" and "date" columns in the header row.'],
    };
  }

  const events: ParsedEvent[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cell = (key: string) => (columns[key] !== undefined ? (row[columns[key]] ?? '').trim() : '');

    const title = cell('title');
    const dateText = cell('date');
    if (!title) {
      errors.push(`Row ${i + 1}: missing title.`);
      continue;
    }
    const date = parseDatePart(dateText);
    if (!date) {
      errors.push(`Row ${i + 1}: couldn’t read the date "${dateText}".`);
      continue;
    }

    const startText = cell('startTime');
    const startTime = startText ? parseTimePart(startText) : null;
    if (startText && !startTime) {
      errors.push(`Row ${i + 1}: couldn’t read the time "${startText}".`);
      continue;
    }
    const allDay = !startTime;
    const start = new Date(
      date.year,
      date.month - 1,
      date.day,
      startTime?.hour ?? 0,
      startTime?.minute ?? 0,
      0,
      0
    );

    let end: Date | null = null;
    const endText = cell('endTime');
    if (endText) {
      const endTime = parseTimePart(endText);
      if (!endTime) {
        // A malformed END time is a row error like a malformed start time —
        // silently importing without it would misrepresent the schedule.
        errors.push(`Row ${i + 1}: couldn’t read the end time "${endText}".`);
        continue;
      }
      end = new Date(date.year, date.month - 1, date.day, endTime.hour, endTime.minute, 0, 0);
      if (end.getTime() <= start.getTime()) end = null; // nonsense range → drop end
    }

    // Cap text fields at the server varchar limits — an over-long value
    // would insert locally, then poison the sync upload with 22001.
    events.push({
      title: title.slice(0, EVENT_TITLE_MAX),
      start,
      end,
      allDay,
      location: cell('location').slice(0, EVENT_LOCATION_MAX) || null,
      notes: cell('notes').slice(0, EVENT_NOTES_MAX) || null,
      color: normalizeColor(cell('color')),
    });
  }

  return { events, errors };
}
