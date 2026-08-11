// The interactive tour script (v2, developer feedback 2026-08-02): the user
// LEARNS BY DOING — they make a real task, complete it, undo it, delete it.
// 'action' steps leave the app fully usable (small card, ring on the target,
// no dim) and advance on the matching tour event, with Next as a fallback.
// 'spotlight' steps dim the screen around the highlighted element.
// Copy rules: simple words, short sentences, no semicolons.
import type { TourEvent } from './events';

export type TourStep = {
  id: string;
  kind: 'action' | 'spotlight';
  /** Anchor element to ring. Action steps may omit it (whole-screen task). */
  anchor?: string;
  tab: '/' | '/daily' | '/calendar' | '/settings';
  title: string;
  body: string;
  /** Card position when anchored below-the-fold elements need clearance. */
  placement: 'above' | 'below';
  /** Auto-advance when this event fires (action steps). */
  advanceOn?: TourEvent;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'add',
    kind: 'action',
    anchor: 'fab',
    tab: '/',
    title: 'Make your first task',
    body: 'Tap the + button. Give it a name and a time, then press Add task.',
    placement: 'above',
    advanceOn: 'task-created',
  },
  {
    id: 'complete',
    kind: 'action',
    tab: '/',
    title: 'Complete it',
    body: 'Swipe your task to the right. The green trail means done.',
    placement: 'below',
    advanceOn: 'task-completed',
  },
  {
    id: 'undo',
    kind: 'action',
    tab: '/',
    title: 'Undo anything',
    body: 'A small toast appears after every action. Tap Undo in it to bring the task back. Every complete and delete can be undone.',
    placement: 'below',
    advanceOn: 'task-uncompleted',
  },
  {
    id: 'delete',
    kind: 'action',
    tab: '/',
    title: 'Delete it',
    body: 'Swipe the task to the left. Deleted tasks wait in the Deleted group at the top, so you can bring them back later.',
    placement: 'below',
    advanceOn: 'task-deleted',
  },
  {
    id: 'search',
    kind: 'spotlight',
    anchor: 'search-bar',
    tab: '/',
    title: 'Find anything',
    body: 'Pull the list down a little to open search. The Filter button narrows by urgency, category, or subject.',
    placement: 'below',
  },
  {
    id: 'daily',
    kind: 'spotlight',
    anchor: 'daily-header',
    tab: '/daily',
    title: 'Daily',
    body: 'Things you do every day live here. Check them off as you go. They reset each morning and stay off the calendar. Tasks due today show here too. Try adding one with the dashed row.',
    placement: 'below',
  },
  {
    id: 'calendar',
    kind: 'spotlight',
    anchor: 'calendar-bar',
    tab: '/calendar',
    title: 'Calendar',
    body: 'Colored dots are tasks and rings are events. Tap any day to see its timeline. Tap the year at the top to zoom out to months.',
    placement: 'below',
  },
  {
    id: 'calendar-tools',
    kind: 'spotlight',
    anchor: 'calendar-tools',
    tab: '/calendar',
    title: 'Week list and imports',
    body: 'The list button shows your whole week on one page. The tray button imports a class or work schedule from a CSV file. It even has an AI prompt to help you make one.',
    placement: 'below',
  },
  {
    id: 'theme',
    kind: 'spotlight',
    anchor: 'theme-toggle',
    tab: '/settings',
    title: 'Light or dark',
    body: 'The sun and moon button flips the look. It sits on every tab. Notifications, the urgency window, and calendar sync all live here in Settings. You can replay this tour here anytime.',
    placement: 'below',
  },
];
