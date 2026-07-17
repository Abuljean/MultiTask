// Feeds the iOS widget: writes the JSON snapshot whenever tasks (or the
// urgency threshold) change and again as the app backgrounds, and drains the
// widget's pending check-off queue on foreground — those completions run
// through the SAME optimistic mutation path as a swipe, so undo/rollback
// semantics hold. All storage access goes through the guarded gateway.
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { useUrgencyThreshold } from '@/hooks/use-urgency-threshold';
import { useSetTaskCompleted, useTasks } from '@/lib/tasks/use-tasks';
import { buildWidgetSnapshot } from '@/lib/widgets/snapshot-data';
import { drainPendingCompletions, writeWidgetSnapshot } from '@/lib/widgets/system';

export function useWidgetSnapshot() {
  const { session } = useAuth();
  const { data: tasks } = useTasks();
  const threshold = useUrgencyThreshold();
  const setCompleted = useSetTaskCompleted();

  const latest = useRef<{ tasks: typeof tasks; threshold: number }>({ tasks, threshold });
  latest.current = { tasks, threshold };
  const mutateRef = useRef(setCompleted.mutate);
  mutateRef.current = setCompleted.mutate;

  // Snapshot on data change (debounced — mutations burst).
  useEffect(() => {
    if (!session || !tasks) return;
    const timer = setTimeout(() => {
      void writeWidgetSnapshot(buildWidgetSnapshot(tasks, new Date(), threshold));
    }, 1500);
    return () => clearTimeout(timer);
  }, [session, tasks, threshold]);

  // Foreground: consume widget check-offs. Background: leave a fresh snapshot.
  useEffect(() => {
    if (!session) return;
    const drain = async () => {
      for (const id of await drainPendingCompletions()) {
        mutateRef.current({ id, isCompleted: true });
      }
    };
    void drain();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void drain();
      } else if (state === 'background') {
        const { tasks: current, threshold: hours } = latest.current;
        if (current) void writeWidgetSnapshot(buildWidgetSnapshot(current, new Date(), hours));
      }
    });
    return () => sub.remove();
  }, [session]);
}
