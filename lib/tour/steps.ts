// The interactive tour script (v4, developer feedback 2026-08-11): guided
// and GATED — during an action step everything except the target is dimmed
// and blocked, so the user completes the instructed action (or presses
// "Skip step"). Deep coverage: build a task field by field inside the
// quick-add sheet, delete/undo/complete it, ADD and CHECK a real daily,
// open a real day timeline, then week list + CSV and Settings.
//
// `host` = which overlay instance shows the step: native modal screens
// (quick-add, day page) paint above the root overlay, so those routes
// render their own overlay instance.
// Copy rules: simple words, short sentences, no semicolons.
import type { TourEvent } from './events';

export type TourHost = 'tabs' | 'quick-add' | 'day';

export type TourStep = {
  id: string;
  kind: 'action' | 'spotlight';
  host: TourHost;
  anchor?: string;
  tab?: '/' | '/daily' | '/calendar' | '/settings';
  title: string;
  body: string;
  webBody?: string;
  placement: 'top' | 'bottom';
  /** Action steps: dim + block everything except the anchor hole. */
  dim?: boolean;
  advanceOn?: TourEvent;
  /** Failsafe: any of these ALSO advances (wrong-but-close actions). */
  advanceOnAny?: TourEvent[];
  advanceOnPath?: string;
  advanceOnPathPrefix?: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'add',
    kind: 'action',
    host: 'tabs',
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
    host: 'quick-add',
    anchor: 'form-when',
    title: 'Name it, time it',
    body: 'Type a name for your task. The chips below set the day and the time. A task only needs those two things. Change the time now, or press Skip step.',
    placement: 'top',
    advanceOn: 'form-date-set',
  },
  {
    id: 'priority',
    kind: 'action',
    host: 'quick-add',
    anchor: 'form-priority',
    title: 'Priority',
    body: 'Tap Details to open the extras. Priority ranks the task: 1st, 2nd, or 3rd shows a badge on the card so it stands out. Pick one.',
    placement: 'top',
    advanceOn: 'form-priority-set',
  },
  {
    id: 'category',
    kind: 'action',
    host: 'quick-add',
    anchor: 'form-category',
    title: 'Category',
    body: 'The outer bucket your task belongs to, like School, Work, or Home. Pick one, or make your own with the + New chip.',
    placement: 'top',
    advanceOn: 'form-category-set',
  },
  {
    id: 'subject',
    kind: 'action',
    host: 'quick-add',
    anchor: 'form-subject',
    title: 'Subject',
    body: 'The topic inside a category. Chemistry inside School. Meetings inside Work. Categories are the big boxes, subjects are what is in them. Pick or make one, then press Add task below.',
    placement: 'top',
    advanceOn: 'task-created',
  },
  {
    id: 'delete',
    kind: 'action',
    host: 'tabs',
    anchor: 'first-task',
    tab: '/',
    title: 'Delete it',
    body: 'There is your task. Swipe it LEFT to delete it. Nothing is ever lost right away.',
    webBody: 'There is your task. Move the mouse to its LEFT edge and click to delete it. Nothing is ever lost right away.',
    placement: 'bottom',
    dim: true,
    advanceOn: 'task-deleted',
    advanceOnAny: ['task-deleted', 'task-completed'],
  },
  {
    id: 'undo',
    kind: 'action',
    host: 'tabs',
    title: 'Bring it back',
    body: 'Tap Undo in the little toast at the bottom. Missed it? Open the Deleted group up top and swipe the task right.',
    webBody: 'Click Undo in the toast at the bottom. Missed it? Open the Deleted group and use the task’s right edge.',
    placement: 'top',
    advanceOn: 'task-restored',
    advanceOnAny: ['task-restored', 'task-uncompleted'],
  },
  {
    id: 'complete',
    kind: 'action',
    host: 'tabs',
    anchor: 'first-task',
    tab: '/',
    title: 'Complete it',
    body: 'Swipe the task RIGHT to complete it. The same swipe in the Completed group brings it back.',
    webBody: 'Click the task’s RIGHT edge to complete it. The same edge in the Completed group brings it back.',
    placement: 'bottom',
    dim: true,
    advanceOn: 'task-completed',
    advanceOnAny: ['task-completed', 'task-deleted'],
  },
  {
    id: 'daily-intro',
    kind: 'spotlight',
    host: 'tabs',
    anchor: 'daily-header',
    tab: '/daily',
    title: 'Daily',
    body: 'Things you do every day live here, like medication or practice. They reset every morning and stay off the calendar. Tasks due today show at the bottom too.',
    placement: 'bottom',
  },
  {
    id: 'daily-add',
    kind: 'action',
    host: 'tabs',
    anchor: 'daily-add',
    tab: '/daily',
    title: 'Add a daily',
    body: 'Tap the dashed row, give it a name, and add it.',
    placement: 'bottom',
    dim: true,
    advanceOn: 'recurring-added',
  },
  {
    id: 'daily-check',
    kind: 'action',
    host: 'tabs',
    anchor: 'first-daily',
    tab: '/daily',
    title: 'Check it off',
    body: 'Tap the circle to mark it done for today. Tomorrow morning it comes back on its own.',
    placement: 'bottom',
    dim: true,
    advanceOn: 'recurring-checked',
  },
  {
    id: 'calendar-intro',
    kind: 'spotlight',
    host: 'tabs',
    anchor: 'calendar-bar',
    tab: '/calendar',
    title: 'Calendar',
    body: 'Every task and event, by day. Dots are tasks, rings are events. Tap the year up top to zoom out to months and years.',
    placement: 'bottom',
  },
  {
    id: 'day-open',
    kind: 'action',
    host: 'tabs',
    tab: '/calendar',
    title: 'Open a day',
    body: 'Tap any day on the grid to see its timeline.',
    placement: 'top',
    advanceOnPathPrefix: '/day',
  },
  {
    id: 'day-tour',
    kind: 'spotlight',
    host: 'day',
    title: 'The day timeline',
    body: 'Events sit on the hour lines, sized by how long they run. Tasks line up by their due time with a one-tap complete circle. The arrows by the date change days, and you can swipe the page sideways too.',
    webBody: 'Events sit on the hour lines, sized by how long they run. Tasks line up by their due time. The arrows by the date change days.',
    placement: 'bottom',
  },
  {
    id: 'day-back',
    kind: 'action',
    host: 'day',
    title: 'Head back',
    body: 'Swipe down from the top of the page, or tap Calendar in the corner.',
    webBody: 'Click the empty space beside the page, or tap Calendar in the corner.',
    placement: 'bottom',
    advanceOnPath: '/calendar',
  },
  {
    id: 'calendar-tools',
    kind: 'spotlight',
    host: 'tabs',
    anchor: 'calendar-tools',
    tab: '/calendar',
    title: 'Week list and imports',
    body: 'The list button shows your whole week on one page. Swipe sideways to move a week at a time, or tap the dates in the middle to jump far. The tray button imports a schedule from a CSV file and can turn it into events or tasks. Nothing to do now — the sheet inside has an AI prompt that builds the file when you need it.',
    placement: 'bottom',
  },
  {
    id: 'theme',
    kind: 'spotlight',
    host: 'tabs',
    anchor: 'theme-toggle',
    tab: '/settings',
    title: 'Make it yours',
    body: 'The sun and moon button flips light and dark, from every tab. Down here you can change your name and photo, how early tasks turn urgent, reminder timing, and calendar sync. Replay this tour from here anytime.',
    placement: 'bottom',
  },
];
