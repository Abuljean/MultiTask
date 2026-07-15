// WEB/DESKTOP notifications (Metro resolves this instead of the native
// module when bundling for web). Browsers can't run scheduled notifications
// while the site is closed (that needs a push server — future work), so the
// honest web version fires them from in-page timers WHILE THE APP IS OPEN:
// same triggers as native (task turns urgent at due−threshold, reminder at
// due−lead), same reconcile strategy (clear all timers, re-plan on every
// change). The Tauri desktop wrapper inherits this behavior as-is.

import { formatDueDate } from '@/lib/tasks/dates';
import type { Task } from '@/lib/tasks/types';

export const DEFAULT_LEAD_MINUTES = 60;
const MAX_SCHEDULED = 48; // parity with native (iOS pending cap headroom)
// setTimeout overflows past ~24.8 days; reconciles happen constantly, so
// only arm timers for the near future.
const MAX_TIMER_MS = 7 * 24 * 60 * 60 * 1000;

let timers: ReturnType<typeof setTimeout>[] = [];

function clearTimers() {
  for (const t of timers) clearTimeout(t);
  timers = [];
}

function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** One-time process setup — nothing to do on web. */
export function initNotifications() {}

/** True if we may notify. Prompts the browser dialog only when the user
 *  hasn't decided yet; afterwards the browser-level setting rules. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    return result === 'granted';
  }
  return false;
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (!notificationsSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.permission === 'denied' ? 'denied' : 'undetermined';
}

function leadLabel(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return `${minutes} minutes`;
}

/** Sign-out cleanup: disarm every in-page timer and clear the tab badge —
 *  otherwise up to 48 armed timers keep firing the previous user's
 *  notifications in the open tab. */
export async function clearTaskNotifications(): Promise<void> {
  clearTimers();
  try {
    const nav = navigator as Navigator & { clearAppBadge?: () => Promise<void> };
    nav.clearAppBadge?.()?.catch(() => {});
  } catch {}
}

/** Re-plan all in-page notification timers. Same call sites as native. */
export async function syncTaskNotifications(
  tasks: Task[],
  options: { urgencyThresholdHours: number; leadMinutes: number }
): Promise<void> {
  clearTimers();
  if (!notificationsSupported() || Notification.permission !== 'granted') return;

  const now = Date.now();

  // Tab/PWA badge where the browser supports it (Chromium); harmless no-op
  // elsewhere. Same semantics as the native app badge: overdue count.
  const overdueCount = tasks.filter(
    (t) => !t.isCompleted && !t.deletedAt && t.dueDate && t.dueDate.getTime() < now
  ).length;
  try {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void> };
    if (overdueCount > 0) nav.setAppBadge?.(overdueCount)?.catch(() => {});
    else (nav as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.()?.catch(() => {});
  } catch {}

  type Planned = { at: number; title: string; body: string };
  const planned: Planned[] = [];

  for (const task of tasks) {
    if (task.isCompleted || task.deletedAt || !task.dueDate) continue;
    const due = task.dueDate.getTime();

    const urgentAt = due - options.urgencyThresholdHours * 60 * 60 * 1000;
    if (urgentAt > now && urgentAt - now < MAX_TIMER_MS) {
      planned.push({
        at: urgentAt,
        title: 'Task now urgent',
        body: `${task.title} — due ${formatDueDate(task.dueDate)}`,
      });
    }

    const dueSoonAt = due - options.leadMinutes * 60 * 1000;
    if (dueSoonAt > now && dueSoonAt - now < MAX_TIMER_MS) {
      planned.push({
        at: dueSoonAt,
        title: `Due in ${leadLabel(options.leadMinutes)}`,
        body: task.title,
      });
    }
  }

  planned.sort((a, b) => a.at - b.at);

  for (const item of planned.slice(0, MAX_SCHEDULED)) {
    timers.push(
      setTimeout(() => {
        try {
          new Notification(item.title, { body: item.body, tag: `multitask-${item.at}-${item.title}` });
        } catch {
          // Some browsers require a service worker for constructor
          // notifications — nothing further to do without one.
        }
      }, item.at - now)
    );
  }
}
