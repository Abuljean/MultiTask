// Applies the pure plan (plan.ts) to the device calendar. Owns exactly one
// app-created calendar named "Multitask" (id remembered in AsyncStorage) and
// only ever touches events whose notes carry the `multitask:{id}` marker —
// a user's own events can never be modified or deleted by us.
//
// Reconcile = true upsert (create missing / update drifted / delete stale)
// rather than notifications' cancel-and-reschedule: calendar event ids are
// user-visible (calendar UI, other apps), so churn is worth avoiding.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { Task } from '@/lib/tasks/types';
import { markerTaskId, planCalendarEvents, WINDOW_DAYS } from './plan';
import { calendarModule } from './system';

const CALENDAR_ID_KEY = 'deviceCalendar.calendarId';
const CALENDAR_TITLE = 'Multitask';
const CALENDAR_COLOR = '#3D4A7A'; // the accent anchor (lib/theme/tokens.ts)

export type CalendarSyncResult = 'ok' | 'unavailable' | 'permission-required';

type CalendarEventLike = {
  id: string;
  title?: string | null;
  notes?: string | null;
  startDate?: string | Date;
  endDate?: string | Date;
};

function asTime(value: string | Date | undefined): number {
  if (!value) return 0;
  return (value instanceof Date ? value : new Date(value)).getTime();
}

async function ensureCalendar(mod: NonNullable<Awaited<ReturnType<typeof calendarModule>>>): Promise<string | null> {
  try {
    const calendars = await mod.getCalendarsAsync(mod.EntityTypes.EVENT);
    const storedId = await AsyncStorage.getItem(CALENDAR_ID_KEY);
    if (storedId && calendars.some((c) => c.id === storedId)) return storedId;

    // AsyncStorage got cleared but our calendar survives — re-adopt by title
    // rather than creating a duplicate.
    const existing = calendars.find((c) => c.title === CALENDAR_TITLE && c.allowsModifications);
    if (existing) {
      await AsyncStorage.setItem(CALENDAR_ID_KEY, existing.id);
      return existing.id;
    }

    let source: { id?: string; name: string; type?: string; isLocalAccount?: boolean };
    if (Platform.OS === 'ios') {
      // Prefer the default calendar's source (iCloud when the user has it) so
      // events sync across their devices; fall back to a local source.
      try {
        const defaultCalendar = await mod.getDefaultCalendarAsync();
        source = defaultCalendar.source;
      } catch {
        source = { isLocalAccount: true, name: CALENDAR_TITLE, type: mod.SourceType.LOCAL };
      }
    } else {
      source = { isLocalAccount: true, name: CALENDAR_TITLE };
    }

    const id = await mod.createCalendarAsync({
      title: CALENDAR_TITLE,
      name: CALENDAR_TITLE,
      color: CALENDAR_COLOR,
      entityType: mod.EntityTypes.EVENT,
      source: source as never,
      sourceId: source.id,
      ownerAccount: 'personal',
      accessLevel: mod.CalendarAccessLevel.OWNER,
    });
    await AsyncStorage.setItem(CALENDAR_ID_KEY, id);
    return id;
  } catch (error) {
    console.warn('Device calendar unavailable', error);
    return null;
  }
}

/** All of OUR events in the calendar, over a sweep window wide enough to
 *  catch events whose task moved outside the 90-day plan window. */
async function ourEvents(
  mod: NonNullable<Awaited<ReturnType<typeof calendarModule>>>,
  calendarId: string
): Promise<CalendarEventLike[]> {
  const now = Date.now();
  const sweepStart = new Date(now - 366 * 24 * 60 * 60 * 1000);
  const sweepEnd = new Date(now + (WINDOW_DAYS + 366) * 24 * 60 * 60 * 1000);
  const events = (await mod.getEventsAsync([calendarId], sweepStart, sweepEnd)) as CalendarEventLike[];
  return events.filter((e) => markerTaskId(e.notes) !== null);
}

/** Reconcile the device calendar with the task list. Never prompts. */
export async function syncDeviceCalendar(tasks: Task[]): Promise<CalendarSyncResult> {
  const mod = await calendarModule();
  if (!mod) return 'unavailable';
  try {
    const permission = await mod.getCalendarPermissionsAsync();
    if (!permission.granted) return 'permission-required';

    const calendarId = await ensureCalendar(mod);
    if (!calendarId) return 'unavailable';

    const desired = planCalendarEvents(tasks, new Date());
    const existing = await ourEvents(mod, calendarId);
    const existingByTask = new Map(existing.map((e) => [markerTaskId(e.notes), e]));

    for (const plan of desired) {
      const current = existingByTask.get(plan.taskId);
      existingByTask.delete(plan.taskId);
      if (!current) {
        await mod.createEventAsync(calendarId, {
          title: plan.title,
          startDate: plan.startDate,
          endDate: plan.endDate,
          notes: plan.notes,
        });
      } else if (
        current.title !== plan.title ||
        asTime(current.startDate) !== plan.startDate.getTime() ||
        asTime(current.endDate) !== plan.endDate.getTime()
      ) {
        await mod.updateEventAsync(current.id, {
          title: plan.title,
          startDate: plan.startDate,
          endDate: plan.endDate,
          notes: plan.notes,
        });
      }
    }

    // Whatever is left is ours but no longer earned (completed/deleted/moved).
    for (const stale of existingByTask.values()) {
      await mod.deleteEventAsync(stale.id);
    }
    return 'ok';
  } catch (error) {
    console.warn('Device calendar sync failed', error);
    return 'unavailable';
  }
}

/** Toggle-off cleanup: delete the app-owned calendar (taking every marked
 *  event with it) and forget its id. Falls back to deleting just our marked
 *  events if only a title-matched calendar is found (never delete a calendar
 *  we can't prove we created). */
export async function removeDeviceCalendar(): Promise<void> {
  const mod = await calendarModule();
  if (!mod) return;
  try {
    const storedId = await AsyncStorage.getItem(CALENDAR_ID_KEY);
    if (storedId) {
      await mod.deleteCalendarAsync(storedId).catch(() => {});
      await AsyncStorage.removeItem(CALENDAR_ID_KEY);
      return;
    }
    const calendars = await mod.getCalendarsAsync(mod.EntityTypes.EVENT);
    const candidate = calendars.find((c) => c.title === CALENDAR_TITLE && c.allowsModifications);
    if (candidate) {
      for (const event of await ourEvents(mod, candidate.id)) {
        await mod.deleteEventAsync(event.id).catch(() => {});
      }
    }
  } catch (error) {
    console.warn('Device calendar cleanup failed', error);
  }
}
