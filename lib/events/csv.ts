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

export type ParsedEvent = {
  title: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  location: string | null;
  notes: string | null;
};

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
};

function mapColumns(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (mapping[key] === undefined && aliases.includes(normalized)) {
        mapping[key] = index;
      }
    }
  });
  return mapping;
}

function parseDatePart(value: string): { year: number; month: number; day: number } | null {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
  // Month-first (US-style). Documented in the import sheet.
  const slash = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(value);
  if (slash) return { year: Number(slash[3]), month: Number(slash[1]), day: Number(slash[2]) };
  return null;
}

function parseTimePart(value: string): { hour: number; minute: number } | null {
  const ampm = /^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]?\.?$/.exec(value);
  if (ampm) {
    let hour = Number(ampm[1]) % 12;
    if (/[Pp]/.test(ampm[3])) hour += 12;
    return { hour, minute: Number(ampm[2] ?? '0') };
  }
  const h24 = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (h24) {
    const hour = Number(h24[1]);
    if (hour > 23) return null;
    return { hour, minute: Number(h24[2]) };
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
      if (endTime) {
        end = new Date(date.year, date.month - 1, date.day, endTime.hour, endTime.minute, 0, 0);
        if (end.getTime() <= start.getTime()) end = null; // nonsense range → drop end
      }
    }

    events.push({
      title,
      start,
      end,
      allDay,
      location: cell('location') || null,
      notes: cell('notes') || null,
    });
  }

  return { events, errors };
}
