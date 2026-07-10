// Keeps the scheduled local notifications in step with reality: whenever the
// task list, urgency threshold, or reminder lead changes, the schedule is
// reconciled (debounced — optimistic mutations can burst several changes).
// Asks for permission exactly once (system dialog on first run); afterwards
// the OS setting rules and Settings shows the state.
import { useEffect } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useNotificationLead } from '@/hooks/use-notification-lead';
import { useUrgencyThreshold } from '@/hooks/use-urgency-threshold';
import { ensureNotificationPermission, syncTaskNotifications } from '@/lib/notifications';
import { useTasks } from '@/lib/tasks/use-tasks';

export function useNotificationSync() {
  const { session } = useAuth();
  const { data: tasks } = useTasks();
  const urgencyThresholdHours = useUrgencyThreshold();
  const leadMinutes = useNotificationLead();

  useEffect(() => {
    if (!session || !tasks) return;
    const timer = setTimeout(async () => {
      await ensureNotificationPermission();
      await syncTaskNotifications(tasks, { urgencyThresholdHours, leadMinutes });
    }, 1000);
    return () => clearTimeout(timer);
  }, [session, tasks, urgencyThresholdHours, leadMinutes]);
}
