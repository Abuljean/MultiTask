// Deep-link notification taps to the exact task (HIG: every notification
// should land on the relevant content, not just open the app). Handles both
// warm taps and cold starts via expo-notifications' last-response hook; a
// ref guards against handling the same response twice.
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

export function useNotificationNavigation() {
  const router = useRouter();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledId = useRef<string | null>(null);

  useEffect(() => {
    if (!lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledId.current === id) return;
    handledId.current = id;
    const taskId = lastResponse.notification.request.content.data?.taskId;
    if (typeof taskId === 'number' && taskId > 0) {
      router.push(`/task/${taskId}`);
    }
  }, [lastResponse, router]);
}
