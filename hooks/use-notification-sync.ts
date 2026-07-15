// Keeps the scheduled local notifications in step with reality: whenever the
// task list, urgency threshold, or reminder lead changes, the schedule is
// reconciled (debounced — optimistic mutations can burst several changes).
// Asks for permission exactly once (system dialog on first run); afterwards
// the OS setting rules and Settings shows the state.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useNotificationLead } from '@/hooks/use-notification-lead';
import { useUrgencyThreshold } from '@/hooks/use-urgency-threshold';
import { ensureNotificationPermission, syncTaskNotifications } from '@/lib/notifications';
import { useTasks } from '@/lib/tasks/use-tasks';

// "Asks exactly once" needs real bookkeeping: on Android 13+ a dismissed
// permission dialog keeps canAskAgain=true, so without this flag every
// debounced reconcile would re-prompt — an infinite nag loop. Settings'
// Enable button still calls ensureNotificationPermission directly (explicit
// user intent may always re-ask while the OS allows it).
const ASKED_ONCE_KEY = 'notifications.askedOnce';

export function useNotificationSync() {
  const { session } = useAuth();
  const { data: tasks } = useTasks();
  const urgencyThresholdHours = useUrgencyThreshold();
  const leadMinutes = useNotificationLead();

  useEffect(() => {
    if (!session || !tasks) return;
    const timer = setTimeout(async () => {
      const asked = await AsyncStorage.getItem(ASKED_ONCE_KEY);
      if (!asked) {
        await AsyncStorage.setItem(ASKED_ONCE_KEY, '1');
        await ensureNotificationPermission();
      }
      await syncTaskNotifications(tasks, { urgencyThresholdHours, leadMinutes });
    }, 1000);
    return () => clearTimeout(timer);
  }, [session, tasks, urgencyThresholdHours, leadMinutes]);
}
