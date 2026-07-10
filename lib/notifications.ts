// Local notification scheduling (handoff MUSTs): a notification when a task
// BECOMES URGENT (crosses the user's urgency threshold) and a reminder
// shortly before the deadline (lead time user-configurable in Settings).
// Everything is computed on-device from due dates — no server push — which
// is why this works in Expo Go (remote push wouldn't).
//
// Reconcile strategy: on every relevant change (tasks, threshold, lead), we
// cancel all of OUR scheduled notifications and re-schedule from scratch.
// Idempotent, no bookkeeping, and safely inside iOS's 64-notification cap
// by taking only the soonest ones.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { formatDueDate } from '@/lib/tasks/dates';
import type { Task } from '@/lib/tasks/types';

export const DEFAULT_LEAD_MINUTES = 60;
const MAX_SCHEDULED = 48; // stay clear of iOS's 64 pending-notification cap
const SOURCE_TAG = 'multitask-task';

/** One-time process setup: foreground display + Android channel. */
export function initNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Task reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

/** True if we may schedule. Prompts the system dialog only the first time
 *  (undetermined); afterwards it defers to the OS-level setting. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (current.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  }
  return false;
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  return current.canAskAgain ? 'undetermined' : 'denied';
}

function leadLabel(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return `${minutes} minutes`;
}

/** Cancel-and-reschedule all task notifications. Call whenever tasks or the
 *  relevant settings change; cheap enough to run debounced. */
export async function syncTaskNotifications(
  tasks: Task[],
  options: { urgencyThresholdHours: number; leadMinutes: number }
): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  const previouslyScheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    previouslyScheduled
      .filter((n) => n.content.data?.source === SOURCE_TAG)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  const now = Date.now();
  type Planned = { at: number; title: string; body: string; taskId: number; kind: string };
  const planned: Planned[] = [];

  for (const task of tasks) {
    if (task.isCompleted || task.deletedAt || !task.dueDate) continue;
    const due = task.dueDate.getTime();

    const urgentAt = due - options.urgencyThresholdHours * 60 * 60 * 1000;
    if (urgentAt > now) {
      planned.push({
        at: urgentAt,
        title: 'Task now urgent',
        body: `${task.title} — due ${formatDueDate(task.dueDate)}`,
        taskId: task.id,
        kind: 'urgent',
      });
    }

    const dueSoonAt = due - options.leadMinutes * 60 * 1000;
    if (dueSoonAt > now) {
      planned.push({
        at: dueSoonAt,
        title: `Due in ${leadLabel(options.leadMinutes)}`,
        body: task.title,
        taskId: task.id,
        kind: 'due-soon',
      });
    }
  }

  planned.sort((a, b) => a.at - b.at);

  for (const item of planned.slice(0, MAX_SCHEDULED)) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body: item.body,
        sound: true,
        data: { source: SOURCE_TAG, taskId: item.taskId, kind: item.kind },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(item.at),
        channelId: 'default',
      },
    });
  }
}
