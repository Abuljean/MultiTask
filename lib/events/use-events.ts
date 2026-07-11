// Calendar events data access. Events are read-mostly: imported in batches
// from CSV, listed on the calendar/Daily views, and deleted (individually
// never — by entire import or all at once). No editing in-app by design.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
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

const EVENTS_KEY = ['events'] as const;

export function useEvents() {
  return useQuery({ queryKey: EVENTS_KEY, queryFn: fetchEvents });
}

async function fetchEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase.from('event').select('*').order('start_at');
  if (error) throw error;
  return (data as EventRow[]).map(toEvent);
}

export function useImportEvents() {
  const queryClient = useQueryClient();
  return useMutation({
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
    onSettled: () => queryClient.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('event').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: EVENTS_KEY });
      queryClient.setQueryData<CalendarEvent[]>(EVENTS_KEY, (old) => old?.filter((e) => e.id !== id));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}

export function useDeleteAllEvents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('event').delete().gte('id', 0);
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: EVENTS_KEY });
      queryClient.setQueryData<CalendarEvent[]>(EVENTS_KEY, []);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}

/** Events grouped by local calendar day (key = YYYY-MM-DD). */
export function eventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const pad = (n: number) => String(n).padStart(2, '0');
  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = `${event.start.getFullYear()}-${pad(event.start.getMonth() + 1)}-${pad(event.start.getDate())}`;
    const existing = byDay.get(key);
    if (existing) existing.push(event);
    else byDay.set(key, [event]);
  }
  return byDay;
}
