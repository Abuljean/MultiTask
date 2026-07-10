// Task data access. TanStack Query owns caching; Supabase is the transport.
// Every screen goes through these hooks — nothing else talks to the `task`
// table. When offline sync lands (Stage 3), the local database slots in
// behind these hooks and screens don't change.
//
// Mutations are OPTIMISTIC (docs/design/04: every action commits locally,
// instantly). The pattern for each: cancel in-flight refetches → snapshot the
// cache → apply the change to the cache immediately → roll back on error →
// re-sync with the server when the dust settles.

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { toInsertRow, toTask, type NewTask, type Task, type TaskRow } from './types';

const TASKS_KEY = ['tasks'] as const;

export function useTasks() {
  return useQuery({ queryKey: TASKS_KEY, queryFn: fetchTasks });
}

async function fetchTasks(): Promise<Task[]> {
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

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewTask) => {
      const userUuid = await currentUserUuid();
      // RLS's WITH CHECK verifies user_uuid === auth.uid() server-side.
      const { data, error } = await supabase
        .from('task')
        .insert(toInsertRow(input, userUuid))
        .select()
        .single();
      if (error) throw error;
      return toTask(data as TaskRow);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useSetTaskCompleted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isCompleted }: { id: number; isCompleted: boolean }) => {
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
 *  deleted_at. The row survives, so undo/restore is a trivial flip back —
 *  same id, nothing lost. Requires supabase/04-soft-delete.sql. */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
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
      const { error } = await supabase.from('task').update({ deleted_at: null }).eq('task_id', id);
      if (error) throw error;
    },
    onMutate: (id) =>
      applyOptimistic(queryClient, (tasks) => tasks.map((t) => (t.id === id ? { ...t, deletedAt: null } : t))),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

/** The real DELETE — only reachable from the Deleted section. Irreversible. */
export function usePermanentlyDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('task').delete().eq('task_id', id);
      if (error) throw error;
    },
    onMutate: (id) => applyOptimistic(queryClient, (tasks) => tasks.filter((t) => t.id !== id)),
    onError: (_error, _vars, context) => rollback(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}
