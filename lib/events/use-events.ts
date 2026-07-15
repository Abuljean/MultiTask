// Calendar events data access. Events are read-mostly: imported in batches
// from CSV, listed on the calendar/Daily views, and deleted. Dual-mode
// transport like the task hooks: local SQLite when PowerSync is active
// (dev build), Supabase REST otherwise (Expo Go).
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { newNumericId } from '@/lib/sync/ids';
import { syncDb } from '@/lib/sync/system';
import { localDateKey } from '@/lib/tasks/calendar';
import { formatWallClock, parseWallClock } from '@/lib/tasks/dates';
import type { ParsedEvent } from './csv';

export type CalendarEvent = {
  id: number;
  title: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  source: string | null;
  /** Hex color; null = the theme's standard event blue. */
  color: string | null;
};

type EventRow = {
  id: number;
  title: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
  source: string | null;
  color?: string | null;
};

type EventSqliteRow = {
  id: string;
  title: string | null;
  start_at: string | null;
  end_at: string | null;
  all_day: number | null;
  location: string | null;
  notes: string | null;
  source: string | null;
  color: string | null;
};

function toEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    start: parseWallClock(row.start_at),
    end: row.end_at ? parseWallClock(row.end_at) : null,
    allDay: row.all_day,
    location: row.location,
    notes: row.notes,
    source: row.source,
    color: row.color ?? null,
  };
}

function toEventFromSqlite(row: EventSqliteRow): CalendarEvent {
  return {
    id: Number(row.id),
    title: row.title ?? '',
    start: row.start_at ? parseWallClock(row.start_at) : new Date(),
    end: row.end_at ? parseWallClock(row.end_at) : null,
    allDay: Boolean(row.all_day),
    location: row.location,
    notes: row.notes,
    source: row.source,
    color: row.color,
  };
}

const EVENTS_KEY = ['events'] as const;
const EVENTS_MUTATION_KEY = ['event-mutations'] as const;

// Same optimistic discipline as the task hooks: snapshot before applying,
// roll back on error (unless another event mutation is in flight — then the
// snapshot is stale and the settle refetch reconciles), refetch last.
async function applyOptimistic(
  queryClient: QueryClient,
  update: (events: CalendarEvent[]) => CalendarEvent[]
): Promise<{ previous: CalendarEvent[] | undefined }> {
  await queryClient.cancelQueries({ queryKey: EVENTS_KEY });
  const previous = queryClient.getQueryData<CalendarEvent[]>(EVENTS_KEY);
  queryClient.setQueryData<CalendarEvent[]>(EVENTS_KEY, (old) => update(old ?? []));
  return { previous };
}

function rollback(queryClient: QueryClient, context?: { previous: CalendarEvent[] | undefined }) {
  if (!context?.previous) return;
  if (queryClient.isMutating({ mutationKey: EVENTS_MUTATION_KEY }) > 1) return;
  queryClient.setQueryData(EVENTS_KEY, context.previous);
}

function settleInvalidate(queryClient: QueryClient) {
  if (queryClient.isMutating({ mutationKey: EVENTS_MUTATION_KEY }) === 1) {
    queryClient.invalidateQueries({ queryKey: EVENTS_KEY });
  }
}

export function useEvents() {
  return useQuery({ queryKey: EVENTS_KEY, queryFn: fetchEvents });
}

async function fetchEvents(): Promise<CalendarEvent[]> {
  const db = syncDb();
  if (db) {
    const rows = await db.getAll<EventSqliteRow>('SELECT * FROM event ORDER BY start_at');
    return rows.map(toEventFromSqlite);
  }
  const { data, error } = await supabase.from('event').select('*').order('start_at');
  if (error) throw error;
  return (data as EventRow[]).map(toEvent);
}

export function useImportEvents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: EVENTS_MUTATION_KEY,
    mutationFn: async ({
      events,
      source,
      defaultColor,
    }: {
      events: ParsedEvent[];
      source: string;
      /** Applied to rows whose CSV didn't specify a color; null = theme blue. */
      defaultColor: string | null;
    }) => {
      const { data } = await supabase.auth.getSession();
      const userUuid = data.session?.user.id;
      if (!userUuid) throw new Error('Not signed in');

      const db = syncDb();
      if (db) {
        await db.writeTransaction(async (tx) => {
          for (const e of events) {
            await tx.execute(
              `INSERT INTO event
                 (id, user_uuid, title, start_at, end_at, all_day, location, notes, source, color, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
              [
                String(newNumericId()),
                userUuid,
                e.title,
                formatWallClock(e.start),
                e.end ? formatWallClock(e.end) : null,
                e.allDay ? 1 : 0,
                e.location,
                e.notes,
                source,
                e.color ?? defaultColor,
                new Date().toISOString(),
              ]
            );
          }
        });
        return events.length;
      }

      const rows = events.map((e) => ({
        user_uuid: userUuid,
        title: e.title,
        start_at: formatWallClock(e.start),
        end_at: e.end ? formatWallClock(e.end) : null,
        all_day: e.allDay,
        location: e.location,
        notes: e.notes,
        source,
        color: e.color ?? defaultColor,
      }));
      // Chunked inserts keep each request comfortably sized.
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await supabase.from('event').insert(rows.slice(i, i + 100));
        if (error) throw error;
      }
      return rows.length;
    },
    onSettled: () => settleInvalidate(queryClient),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: EVENTS_MUTATION_KEY,
    mutationFn: async (id: number) => {
      const db = syncDb();
      if (db) {
        await db.execute('DELETE FROM event WHERE id=?', [String(id)]);
        return;
      }
      const { error } = await supabase.from('event').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: (id) => applyOptimistic(queryClient, (events) => events.filter((e) => e.id !== id)),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => settleInvalidate(queryClient),
  });
}

export function useDeleteAllEvents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: EVENTS_MUTATION_KEY,
    mutationFn: async () => {
      const db = syncDb();
      if (db) {
        await db.execute('DELETE FROM event');
        return;
      }
      const { error } = await supabase.from('event').delete().gte('id', 0);
      if (error) throw error;
    },
    onMutate: () => applyOptimistic(queryClient, () => []),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => settleInvalidate(queryClient),
  });
}

/** Events grouped by local calendar day (key = YYYY-MM-DD). */
export function eventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = localDateKey(event.start);
    const existing = byDay.get(key);
    if (existing) existing.push(event);
    else byDay.set(key, [event]);
  }
  return byDay;
}
