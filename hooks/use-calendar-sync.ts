// Keeps the device calendar in step with the task list (debounced, same
// shape as use-notification-sync). Never prompts for permission — that
// happens only on the Settings toggle. When the toggle is off this hook
// does nothing at all (cleanup also happens at the toggle).
import { useEffect } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useCalendarSyncEnabled } from '@/hooks/use-calendar-sync-enabled';
import { syncDeviceCalendar } from '@/lib/device-calendar/sync';
import { useTasks } from '@/lib/tasks/use-tasks';

export function useCalendarSync() {
  const { session } = useAuth();
  const { data: tasks } = useTasks();
  const enabled = useCalendarSyncEnabled();

  useEffect(() => {
    if (!session || !tasks || !enabled) return;
    const timer = setTimeout(() => {
      void syncDeviceCalendar(tasks);
    }, 1500);
    return () => clearTimeout(timer);
  }, [session, tasks, enabled]);
}
