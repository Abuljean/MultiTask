// Recurring daily tasks — the data behind the Daily view. A recurring task
// is "done today" when a completion row exists for the device's current
// calendar day. Dual-mode transport like use-tasks.ts: local SQLite when
// PowerSync is active (dev build), Supabase REST otherwise (Expo Go).
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { newNumericId, newUuid } from '@/lib/sync/ids';
import { syncDb } from '@/lib/sync/system';

export type RecurringTask = {
  id: number;
  title: string;
  sortOrder: number;
  doneToday: boolean;
};

type RecurringTaskRow = {
  id: number;
  title: string;
  sort_order: number;
  archived_at: string | null;
};

/** Local calendar day as YYYY-MM-DD — the key for "today". */
export function localDateKey(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const RECURRING_KEY = ['recurring'] as const;

export function useRecurringTasks() {
  return useQuery({ queryKey: RECURRING_KEY, queryFn: fetchRecurring });
}

async function fetchRecurring(): Promise<RecurringTask[]> {
  const today = localDateKey();
  const db = syncDb();
  if (db) {
    const tasks = await db.getAll<{ id: string; title: string; sort_order: number }>(
      'SELECT id, title, sort_order FROM recurring_task WHERE archived_at IS NULL ORDER BY sort_order, created_at'
    );
    const done = await db.getAll<{ recurring_task_id: number }>(
      'SELECT recurring_task_id FROM recurring_completion WHERE done_on = ?',
      [today]
    );
    const doneIds = new Set(done.map((row) => Number(row.recurring_task_id)));
    return tasks.map((row) => ({
      id: Number(row.id),
      title: row.title,
      sortOrder: row.sort_order,
      doneToday: doneIds.has(Number(row.id)),
    }));
  }

  const [tasksResult, completionsResult] = await Promise.all([
    supabase
      .from('recurring_task')
      .select('id, title, sort_order, archived_at')
      .is('archived_at', null)
      .order('sort_order')
      .order('created_at'),
    supabase.from('recurring_completion').select('recurring_task_id').eq('done_on', today),
  ]);
  if (tasksResult.error) throw tasksResult.error;
  if (completionsResult.error) throw completionsResult.error;
  const doneIds = new Set(
    (completionsResult.data as { recurring_task_id: number }[]).map((row) => row.recurring_task_id)
  );
  return (tasksResult.data as RecurringTaskRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    sortOrder: row.sort_order,
    doneToday: doneIds.has(row.id),
  }));
}

async function applyOptimistic(
  queryClient: QueryClient,
  update: (tasks: RecurringTask[]) => RecurringTask[]
): Promise<{ previous: RecurringTask[] | undefined }> {
  await queryClient.cancelQueries({ queryKey: RECURRING_KEY });
  const previous = queryClient.getQueryData<RecurringTask[]>(RECURRING_KEY);
  queryClient.setQueryData<RecurringTask[]>(RECURRING_KEY, (old) => update(old ?? []));
  return { previous };
}

function rollback(queryClient: QueryClient, context?: { previous: RecurringTask[] | undefined }) {
  if (context?.previous) {
    queryClient.setQueryData(RECURRING_KEY, context.previous);
  }
}

async function currentUserUuid(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const uuid = data.session?.user.id;
  if (!uuid) throw new Error('Not signed in');
  return uuid;
}

export function useAddRecurringTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, sortOrder }: { title: string; sortOrder: number; tempId: number }) => {
      const userUuid = await currentUserUuid();
      const db = syncDb();
      if (db) {
        await db.execute(
          'INSERT INTO recurring_task (id, user_uuid, title, sort_order, created_at, archived_at) VALUES (?,?,?,?,?,NULL)',
          [String(newNumericId()), userUuid, title, sortOrder, new Date().toISOString()]
        );
        return;
      }
      const { error } = await supabase
        .from('recurring_task')
        .insert({ user_uuid: userUuid, title, sort_order: sortOrder });
      if (error) throw error;
    },
    onMutate: ({ title, sortOrder, tempId }) =>
      applyOptimistic(queryClient, (tasks) => [
        ...tasks,
        { id: tempId, title, sortOrder, doneToday: false },
      ]),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: RECURRING_KEY }),
  });
}

export function useSetRecurringDone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, done }: { id: number; done: boolean }) => {
      const today = localDateKey();
      const db = syncDb();
      if (db) {
        if (done) {
          const userUuid = await currentUserUuid();
          await db.execute(
            'INSERT INTO recurring_completion (id, recurring_task_id, user_uuid, done_on) VALUES (?,?,?,?)',
            [newUuid(), id, userUuid, today]
          );
        } else {
          await db.execute('DELETE FROM recurring_completion WHERE recurring_task_id=? AND done_on=?', [
            id,
            today,
          ]);
        }
        return;
      }
      if (done) {
        const userUuid = await currentUserUuid();
        const { error } = await supabase
          .from('recurring_completion')
          .insert({ recurring_task_id: id, user_uuid: userUuid, done_on: today });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('recurring_completion')
          .delete()
          .eq('recurring_task_id', id)
          .eq('done_on', today);
        if (error) throw error;
      }
    },
    onMutate: ({ id, done }) =>
      applyOptimistic(queryClient, (tasks) =>
        tasks.map((t) => (t.id === id ? { ...t, doneToday: done } : t))
      ),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: RECURRING_KEY }),
  });
}

/** Archive, not delete — completion history stays in the database. */
export function useArchiveRecurringTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const db = syncDb();
      if (db) {
        await db.execute('UPDATE recurring_task SET archived_at=? WHERE id=?', [
          new Date().toISOString(),
          String(id),
        ]);
        return;
      }
      const { error } = await supabase
        .from('recurring_task')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: (id) => applyOptimistic(queryClient, (tasks) => tasks.filter((t) => t.id !== id)),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: RECURRING_KEY }),
  });
}

/** Undo for archive: flips archived_at back (same row, same id). */
export function useUnarchiveRecurringTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: RecurringTask) => {
      const db = syncDb();
      if (db) {
        await db.execute('UPDATE recurring_task SET archived_at=NULL WHERE id=?', [String(task.id)]);
        return;
      }
      const { error } = await supabase.from('recurring_task').update({ archived_at: null }).eq('id', task.id);
      if (error) throw error;
    },
    onMutate: (task) =>
      applyOptimistic(queryClient, (tasks) =>
        [...tasks, task].sort((a, b) => a.sortOrder - b.sortOrder)
      ),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: RECURRING_KEY }),
  });
}
