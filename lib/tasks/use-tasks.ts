// Task data access. TanStack Query owns caching and refetching; Supabase is
// the transport. Every screen goes through these hooks — nothing else in the
// app talks to the `task` table directly. That boundary is deliberate: when
// offline sync lands (Stage 3), the local database slots in behind these
// hooks and screens don't change.
//
// NOTE: mutations currently invalidate-and-refetch, which needs a network
// round trip. The optimistic-update pass (docs/design/04: every action
// commits locally, instantly) comes with the real UI — no point polishing
// perceived latency on a debug screen.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { toInsertRow, toTask, type NewTask, type Task, type TaskRow } from './types';

const TASKS_KEY = ['tasks'] as const;

export function useTasks() {
  return useQuery({ queryKey: TASKS_KEY, queryFn: fetchTasks });
}

async function fetchTasks(): Promise<Task[]> {
  // RLS scopes this to the signed-in user's rows — no .eq('user_uuid', ...)
  // filter needed, and none COULD leak other users' data even if forgotten.
  const { data, error } = await supabase
    .from('task')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data as TaskRow[]).map(toTask);
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewTask) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userUuid = sessionData.session?.user.id;
      if (!userUuid) throw new Error('Not signed in');
      // RLS's WITH CHECK verifies user_uuid === auth.uid() server-side;
      // sending anyone else's uuid would be rejected by the database.
      const { data, error } = await supabase
        .from('task')
        .insert(toInsertRow(input, userUuid))
        .select()
        .single();
      if (error) throw error;
      return toTask(data as TaskRow);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useSetTaskCompleted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isCompleted }: { id: number; isCompleted: boolean }) => {
      const { error } = await supabase.from('task').update({ is_completed: isCompleted }).eq('task_id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('task').delete().eq('task_id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}
