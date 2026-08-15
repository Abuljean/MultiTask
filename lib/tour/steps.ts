// The interactive tour script (v3, developer script 2026-08-11): a guided
// build-your-first-task — the tour walks INTO the quick-add sheet (date,
// priority, category vs subject), then delete / undo / complete on the real
// task, then Daily, Calendar (month-year-day + week list + CSV), Settings.
//
// Step kinds:
//   action    — the user DOES something; auto-advances on a tour event or a
//               route change. `dim` blocks everything except the ringed
//               target; without `dim` the whole app stays usable.
//   spotlight — explanation over a dimmed screen; Next advances.
// Copy rules: simple words, short sentences, no semicolons. `webBody`
// replaces `body` on web/desktop (swipes become edge clicks there).
import type { TourEvent } from './events';

export type TourStep = {
  id: string;
  kind: 'action' | 'spotlight';
  anchor?: string;
  /** Tab to be on for this step. Omitted = stay wherever the flow is. */
  tab?: '/' | '/daily' | '/calendar' | '/settings';
  title: string;
  body: string;
  webBody?: string;
  /** Card position. */
  placement: 'top' | 'bottom';
  /** Action steps: dim + block everything except the anchor hole. */
  dim?: boolean;
  advanceOn?: TourEvent;
  /** Auto-advance when the app lands on this path (e.g. a sheet opens). */
  advanceOnPath?: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'add',
    kind: 'action',
    anchor: 'fab',
    tab: '/',
    title: 'Make your first task',
    body: 'Tap the + button.',
    placement: 'top',
    dim: true,
    advanceOnPath: '/quick-add',
  },
  {
    id: 'when',
    kind: 'action',
    anchor: 'form-when',
    title: 'Name it, time it',
    body: 'Type a name for your task. The chips below set the day and the time. A task only needs those two things. Try changing the time, or press Next.',
    placement: 'top',
    advanceOn: 'form-date-set',
  },
  {
    id: 'priority',
    kind: 'action',
    anchor: 'form-priority',
    title: 'Priority',
    body: 'Tap Details to open the extras. Priority ranks the task: 1st, 2nd, or 3rd shows a badge on the card so it stands out. Pick one, or press Next.',
    placement: 'top',
    advanceOn: 'form-priority-set',
  },
  {
    id: 'category',
    kind: 'action',
    anchor: 'form-category',
    title: 'Category',
    body: 'The outer bucket your task belongs to, like School, Work, or Home. Make one with the + New chip, or press Next.',
    placement: 'top',
    advanceOn: 'form-category-set',
  },
  {
    id: 'subject',
    kind: 'action',
    anchor: 'form-subject',
    title: 'Subject',
    body: 'The topic inside a category. Chemistry inside School. Meetings inside Work. Categories are the big boxes, subjects are what is in them. Pick or make one, then press Add task below.',
    placement: 'top',
    advanceOn: 'task-created',
  },
  {
    id: 'delete',
    kind: 'action',
    anchor: 'first-task',
    tab: '/',
    title: 'Delete it',
    body: 'There is your task. Now swipe it LEFT to delete it. Do not worry, nothing is ever lost right away.',
    webBody: 'There is your task. Move the mouse to its LEFT edge and click to delete it. Nothing is ever lost right away.',
    placement: 'bottom',
    advanceOn: 'task-deleted',
  },
  {
    id: 'undo',
    kind: 'action',
    title: 'Bring it back',
    body: 'Tap Undo in the little toast at the bottom. Missed it? Open the Deleted group up top and swipe the task right.',
    webBody: 'Click Undo in the toast at the bottom. Missed it? Open the Deleted group and use the task’s right edge.',
    placement: 'top',
    advanceOn: 'task-restored',
  },
  {
    id: 'complete',
    kind: 'action',
    anchor: 'first-task',
    tab: '/',
    title: 'Complete it',
    body: 'Swipe the task RIGHT to complete it. The same swipe in the Completed group brings it back.',
    webBody: 'Click the task’s RIGHT edge to complete it. The same edge in the Completed group brings it back.',
    placement: 'bottom',
    advanceOn: 'task-completed',
  },
  {
    id: 'daily',
    kind: 'spotlight',
    anchor: 'daily-header',
    tab: '/daily',
    title: 'Daily',
    body: 'Things you do every day live here. Check them off as you go. They reset every morning and stay off the calendar. Tasks due today show here too. Add one anytime with the dashed row.',
    placement: 'bottom',
  },
  {
    id: 'calendar',
    kind: 'spotlight',
    anchor: 'calendar-bar',
    tab: '/calendar',
    title: 'Calendar',
    body: 'Every task and event, by day. Dots are tasks, rings are events. Tap the year up top to zoom out to months. Tap any day to open its timeline. In there, swipe sideways to move between days and swipe down to leave.',
    placement: 'bottom',
  },
  {
    id: 'calendar-tools',
    kind: 'spotlight',
    anchor: 'calendar-tools',
    tab: '/calendar',
    title: 'Week list and imports',
    body: 'The list button shows your whole week on one page. Swipe sideways to move a week at a time, or tap the dates in the middle to jump far. The tray button imports a schedule from a CSV file and can turn it into events or tasks. It is not needed now, but the sheet inside has an AI prompt that builds the file for you.',
    placement: 'bottom',
  },
  {
    id: 'theme',
    kind: 'spotlight',
    anchor: 'theme-toggle',
    tab: '/settings',
    title: 'Make it yours',
    body: 'The sun and moon button flips light and dark, from every tab. Down here in Settings you can change your name and photo, how early tasks turn urgent, reminder timing, and calendar sync. You can replay this tour here anytime.',
    placement: 'bottom',
  },
];
