// Applies Siri/Control-Center requests when the app comes to the front:
// queued "add a task" titles run through the SAME optimistic create the
// quick-add sheet uses (due = today 11:59 PM, its default), and a pending
// "quick add" request pushes the sheet. Foreground + mount, like the widget
// drain.
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { endOfToday } from '@/lib/tasks/dates';
import { useCreateTask } from '@/lib/tasks/use-tasks';
import { consumeQuickAddRequest, drainSiriTasks } from '@/lib/siri/system';

export function useSiriActions() {
  const { session } = useAuth();
  const router = useRouter();
  const createTask = useCreateTask();
  const mutateRef = useRef(createTask.mutate);
  mutateRef.current = createTask.mutate;

  useEffect(() => {
    if (!session) return;
    const drain = async () => {
      let seq = 0;
      for (const pending of await drainSiriTasks()) {
        // Same negative-timestamp temp-id convention as quick-add (seq keeps
        // two same-millisecond drains distinct).
        mutateRef.current({
          input: { title: pending.title.slice(0, 100), dueDate: endOfToday() },
          tempId: -Date.now() - seq++,
        });
      }
      if (await consumeQuickAddRequest()) {
        router.push('/quick-add');
      }
    };
    void drain();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void drain();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
}
