// Notification responses, both kinds (HIG: land on the relevant content):
//   - a plain tap deep-links to the task's edit sheet
//   - the "Complete" action button completes the task through the SAME
//     optimistic mutation path the swipe uses, then stays where it is
// Handles warm taps and cold starts via expo-notifications' last-response
// hook; a ref guards against handling the same response twice.
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useUndoToast } from '@/components/undo-toast';
import { COMPLETE_ACTION_ID } from '@/lib/notifications';
import { useSetTaskCompleted } from '@/lib/tasks/use-tasks';

export function useNotificationNavigation() {
  const router = useRouter();
  const toast = useUndoToast();
  const setCompleted = useSetTaskCompleted();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledId = useRef<string | null>(null);

  useEffect(() => {
    if (!lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledId.current === id) return;
    handledId.current = id;
    const taskId = lastResponse.notification.request.content.data?.taskId;
    if (typeof taskId !== 'number' || taskId <= 0) return;

    if (lastResponse.actionIdentifier === COMPLETE_ACTION_ID) {
      setCompleted.mutate(
        { id: taskId, isCompleted: true },
        {
          onSuccess: () => toast.show({ message: 'Task completed.' }),
          onError: () => toast.show({ message: 'Couldn’t complete the task — it’s still open.' }),
        }
      );
      return;
    }
    router.push(`/task/${taskId}`);
    // setCompleted/toast are stable enough for this effect's purpose; keying
    // on them would re-handle guarded responses for no gain.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResponse, router]);
}
