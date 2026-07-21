// Feeds the iOS widget: writes the JSON snapshot whenever tasks, events, or
// the urgency threshold change and again as the app backgrounds, and drains
// the widget's pending check-off TOGGLES on foreground — each completion or
// un-completion runs through the SAME optimistic mutation path as a swipe, so
// undo/rollback semantics hold. All storage access goes through the guarded
// gateway (iOS-only; no-ops elsewhere).
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { useUrgencyThreshold } from '@/hooks/use-urgency-threshold';
import { useEvents } from '@/lib/events/use-events';
import { useSetTaskCompleted, useTasks } from '@/lib/tasks/use-tasks';
import { buildWidgetSnapshot } from '@/lib/widgets/snapshot-data';
import { drainPendingToggles, writeWidgetSnapshot } from '@/lib/widgets/system';

export function useWidgetSnapshot() {
  const { session } = useAuth();
  const { data: tasks } = useTasks();
  const { data: events } = useEvents();
  const threshold = useUrgencyThreshold();
  const setCompleted = useSetTaskCompleted();

  const latest = useRef<{ tasks: typeof tasks; events: typeof events; threshold: number }>({
    tasks,
    events,
    threshold,
  });
  latest.current = { tasks, events, threshold };
  const mutateRef = useRef(setCompleted.mutate);
  mutateRef.current = setCompleted.mutate;

  // Snapshot on data change (debounced — mutations burst).
  useEffect(() => {
    if (!session || !tasks) return;
    const timer = setTimeout(() => {
      void writeWidgetSnapshot(buildWidgetSnapshot(tasks, events ?? [], new Date(), threshold));
    }, 1500);
    return () => clearTimeout(timer);
  }, [session, tasks, events, threshold]);

  // Foreground: apply widget check-off toggles. Background: leave a fresh snapshot.
  useEffect(() => {
    if (!session) return;
    const drain = async () => {
      for (const { id, done } of await drainPendingToggles()) {
        mutateRef.current({ id, isCompleted: done });
      }
    };
    void drain();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void drain();
      } else if (state === 'background') {
        const { tasks: t, events: e, threshold: hours } = latest.current;
        if (t) void writeWidgetSnapshot(buildWidgetSnapshot(t, e ?? [], new Date(), hours));
      }
    });
    return () => sub.remove();
  }, [session]);
}
