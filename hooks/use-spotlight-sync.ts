// Keeps iOS system search in step with the task list (debounced, same shape
// as the notification/calendar sync hooks). Soft no-op everywhere the
// native module is absent.
import { useEffect } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { buildSpotlightItems } from '@/lib/native/spotlight-items';
import { indexSpotlightTasks } from '@/lib/native/system';
import { useTasks } from '@/lib/tasks/use-tasks';

export function useSpotlightSync() {
  const { session } = useAuth();
  const { data: tasks } = useTasks();

  useEffect(() => {
    if (!session || !tasks) return;
    const timer = setTimeout(() => {
      void indexSpotlightTasks(buildSpotlightItems(tasks));
    }, 2000);
    return () => clearTimeout(timer);
  }, [session, tasks]);
}
