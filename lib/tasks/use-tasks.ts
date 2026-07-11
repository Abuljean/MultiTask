// Task data access. TanStack Query owns caching; the TRANSPORT is dual-mode:
//   - Online mode (Expo Go / no PowerSync configured): Supabase REST, as
//     always. RLS scopes everything server-side.
//   - Sync mode (dev build + PowerSync): reads/writes hit the LOCAL SQLite
//     database — instant and fully offline — and PowerSync replays writes
//     to Supabase (through RLS) in the background. Remote changes arrive
//     via components/sync-bridge.tsx, which invalidates these query keys.
// Screens never know which mode is active; every hook branches internally
// on syncDb(). All mutations stay optimistic — in sync mode that's belt and
// suspenders (local writes are already instant).

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { placeholders, syncDb } from '@/lib/sync/system';
import { newNumericId } from '@/lib/sync/ids';
import { formatWallClock } from './dates';
import {
  DEFAULT_CATEGORY,
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_SUBJECT_COLOR,
  toInsertRow,
  toTask,
  toTaskFromSqlite,
  toUpdateRow,
  type NewTask,
  type Task,
  type TaskEdits,
  type TaskRow,
  type TaskSqliteRow,
} from './types';

const TASKS_KEY = ['tasks'] as const;

export function useTasks() {
  return useQuery({ queryKey: TASKS_KEY, queryFn: fetchTasks });
}

async function fetchTasks(): Promise<Task[]> {
  const db = syncDb();
  if (db) {
    const rows = await db.getAll<TaskSqliteRow>(
      'SELECT * FROM task ORDER BY due_date IS NULL, due_date'
    );
    return rows.map(toTaskFromSqlite);
  }
  // RLS scopes this to the signed-in user's rows — no client-side filter
  // needed, and none COULD leak other users' data even if forgotten.
  const { data, error } = await supabase
    .from('task')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data as TaskRow[]).map(toTask);
}

/** Shared optimistic-update boilerplate: snapshot, apply, and hand back the
 *  snapshot for rollback. */
async function applyOptimistic(
  queryClient: QueryClient,
  update: (tasks: Task[]) => Task[]
): Promise<{ previous: Task[] | undefined }> {
  await queryClient.cancelQueries({ queryKey: TASKS_KEY });
  const previous = queryClient.getQueryData<Task[]>(TASKS_KEY);
  queryClient.setQueryData<Task[]>(TASKS_KEY, (old) => update(old ?? []));
  return { previous };
}

function rollback(queryClient: QueryClient, context?: { previous: Task[] | undefined }) {
  if (context?.previous) {
    queryClient.setQueryData(TASKS_KEY, context.previous);
  }
}

async function currentUserUuid(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const uuid = data.session?.user.id;
  if (!uuid) throw new Error('Not signed in');
  return uuid;
}

/** Optimistic create: the caller supplies a temporary NEGATIVE id (so it can
 *  never collide with a real task_id and the caller can reference the row,
 *  e.g. for the entrance animation). The temp task shows instantly; on
 *  success it's swapped for the created row in place. */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input }: { input: NewTask; tempId: number }) => {
      const userUuid = await currentUserUuid();
      const db = syncDb();
      if (db) {
        const id = newNumericId();
        const now = new Date();
        const task: Task = {
          id,
          title: input.title,
          description: input.description ?? '',
          createdAt: now,
          dueDate: input.dueDate,
          isCompleted: false,
          subject: input.subject ?? '',
          subjectColor: input.subjectColor ?? DEFAULT_SUBJECT_COLOR,
          category: input.category ?? DEFAULT_CATEGORY,
          categoryColor: input.categoryColor ?? DEFAULT_CATEGORY_COLOR,
          priority: input.priority ?? null,
          deletedAt: null,
        };
        await db.execute(
          `INSERT INTO task
             (id, user_uuid, title, description, creation_date, due_date, is_completed,
              subject, subject_color, category, category_color, priority, deleted_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            String(id),
            userUuid,
            task.title,
            task.description,
            now.toISOString(),
            task.dueDate ? formatWallClock(task.dueDate) : null,
            0,
            task.subject,
            task.subjectColor,
            task.category,
            task.categoryColor,
            task.priority,
            null,
          ]
        );
        return task;
      }
      // RLS's WITH CHECK verifies user_uuid === auth.uid() server-side.
      const { data, error } = await supabase
        .from('task')
        .insert(toInsertRow(input, userUuid))
        .select()
        .single();
      if (error) throw error;
      return toTask(data as TaskRow);
    },
    onMutate: ({ input, tempId }) =>
      applyOptimistic(queryClient, (tasks) => [
        ...tasks,
        {
          id: tempId,
          title: input.title,
          description: input.description ?? '',
          createdAt: new Date(),
          dueDate: input.dueDate,
          isCompleted: false,
          subject: input.subject ?? '',
          subjectColor: input.subjectColor ?? DEFAULT_SUBJECT_COLOR,
          category: input.category ?? DEFAULT_CATEGORY,
          categoryColor: input.categoryColor ?? DEFAULT_CATEGORY_COLOR,
          priority: input.priority ?? null,
          deletedAt: null,
        },
      ]),
    onSuccess: (createdTask, { tempId }) =>
      queryClient.setQueryData<Task[]>(TASKS_KEY, (old) =>
        old?.map((t) => (t.id === tempId ? createdTask : t))
      ),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

/** Full-field edit from the task detail sheet. Optimistic like the rest. */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, edits }: { id: number; edits: TaskEdits }) => {
      const db = syncDb();
      if (db) {
        await db.execute(
          `UPDATE task SET title=?, due_date=?, description=?, priority=?,
             category=?, category_color=?, subject=?, subject_color=? WHERE id=?`,
          [
            edits.title,
            edits.dueDate ? formatWallClock(edits.dueDate) : null,
            edits.description,
            edits.priority,
            edits.category,
            edits.categoryColor,
            edits.subject,
            edits.subjectColor,
            String(id),
          ]
        );
        return;
      }
      const { error } = await supabase.from('task').update(toUpdateRow(edits)).eq('task_id', id);
      if (error) throw error;
    },
    onMutate: ({ id, edits }) =>
      applyOptimistic(queryClient, (tasks) =>
        tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                title: edits.title,
                dueDate: edits.dueDate,
                description: edits.description,
                priority: edits.priority,
                category: edits.category,
                categoryColor: edits.categoryColor,
                subject: edits.subject,
                subjectColor: edits.subjectColor,
              }
            : t
        )
      ),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useSetTaskCompleted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isCompleted }: { id: number; isCompleted: boolean }) => {
      const db = syncDb();
      if (db) {
        await db.execute('UPDATE task SET is_completed=? WHERE id=?', [isCompleted ? 1 : 0, String(id)]);
        return;
      }
      const { error } = await supabase.from('task').update({ is_completed: isCompleted }).eq('task_id', id);
      if (error) throw error;
    },
    onMutate: ({ id, isCompleted }) =>
      applyOptimistic(queryClient, (tasks) => tasks.map((t) => (t.id === id ? { ...t, isCompleted } : t))),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

/** Soft delete: moves the task to the trash ("Deleted" section) by setting
 *  deleted_at. The row survives, so undo/restore is a trivial flip back. */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const db = syncDb();
      if (db) {
        await db.execute('UPDATE task SET deleted_at=? WHERE id=?', [new Date().toISOString(), String(id)]);
        return;
      }
      const { error } = await supabase
        .from('task')
        .update({ deleted_at: new Date().toISOString() })
        .eq('task_id', id);
      if (error) throw error;
    },
    onMutate: (id) =>
      applyOptimistic(queryClient, (tasks) =>
        tasks.map((t) => (t.id === id ? { ...t, deletedAt: new Date() } : t))
      ),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

/** Restore from trash (undo toast, or swipe-right in the Deleted section). */
export function useRestoreTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const db = syncDb();
      if (db) {
        await db.execute('UPDATE task SET deleted_at=NULL WHERE id=?', [String(id)]);
        return;
      }
      const { error } = await supabase.from('task').update({ deleted_at: null }).eq('task_id', id);
      if (error) throw error;
    },
    onMutate: (id) =>
      applyOptimistic(queryClient, (tasks) => tasks.map((t) => (t.id === id ? { ...t, deletedAt: null } : t))),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

/** Bulk soft delete — "Clear all completed". One optimistic sweep; the undo
 *  toast restores the whole batch. */
export function useBulkSoftDeleteTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const db = syncDb();
      if (db) {
        await db.execute(
          `UPDATE task SET deleted_at=? WHERE id IN (${placeholders(ids.length)})`,
          [new Date().toISOString(), ...ids.map(String)]
        );
        return;
      }
      const { error } = await supabase
        .from('task')
        .update({ deleted_at: new Date().toISOString() })
        .in('task_id', ids);
      if (error) throw error;
    },
    onMutate: (ids) =>
      applyOptimistic(queryClient, (tasks) =>
        tasks.map((t) => (ids.includes(t.id) ? { ...t, deletedAt: new Date() } : t))
      ),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

/** Undo for the bulk clear: flips the whole batch back. */
export function useBulkRestoreTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const db = syncDb();
      if (db) {
        await db.execute(
          `UPDATE task SET deleted_at=NULL WHERE id IN (${placeholders(ids.length)})`,
          ids.map(String)
        );
        return;
      }
      const { error } = await supabase.from('task').update({ deleted_at: null }).in('task_id', ids);
      if (error) throw error;
    },
    onMutate: (ids) =>
      applyOptimistic(queryClient, (tasks) =>
        tasks.map((t) => (ids.includes(t.id) ? { ...t, deletedAt: null } : t))
      ),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

/** Empty the trash — bulk permanent DELETE. Irreversible; caller confirms. */
export function useBulkPermanentlyDeleteTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const db = syncDb();
      if (db) {
        await db.execute(`DELETE FROM task WHERE id IN (${placeholders(ids.length)})`, ids.map(String));
        return;
      }
      const { error } = await supabase.from('task').delete().in('task_id', ids);
      if (error) throw error;
    },
    onMutate: (ids) => applyOptimistic(queryClient, (tasks) => tasks.filter((t) => !ids.includes(t.id))),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

/** The real DELETE — only reachable from the Deleted section. Irreversible. */
export function usePermanentlyDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const db = syncDb();
      if (db) {
        await db.execute('DELETE FROM task WHERE id=?', [String(id)]);
        return;
      }
      const { error } = await supabase.from('task').delete().eq('task_id', id);
      if (error) throw error;
    },
    onMutate: (id) => applyOptimistic(queryClient, (tasks) => tasks.filter((t) => t.id !== id)),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}
