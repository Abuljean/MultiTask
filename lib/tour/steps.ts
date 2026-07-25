// The interactive tour's script: each step names a screen anchor (a real UI
// element registered via <TourAnchor>), where the tooltip sits relative to
// it, and the factual copy (doc 06 voice). The overlay engine walks these in
// order, switching tabs as needed. Copy derives from the v1 guide.

export type TourStep = {
  id: string;
  /** Anchor id registered by a TourAnchor somewhere in the tree. */
  anchor: string;
  /** Tab route to be on before highlighting (expo-router href). */
  tab: '/' | '/daily' | '/calendar' | '/settings';
  title: string;
  body: string;
  /** Tooltip position relative to the spotlight hole. */
  placement: 'above' | 'below';
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'fab',
    anchor: 'fab',
    tab: '/',
    title: 'Add a task',
    body: 'Tap + to add a task — it only needs a title and a time. Categories, priority, and notes live under Details.',
    placement: 'above',
  },
  {
    id: 'list',
    anchor: 'task-list',
    tab: '/',
    title: 'Complete and delete',
    body: 'Swipe a task right to complete it, left to delete. Everything shows an undo for 5 seconds. Colors are status: green ongoing, orange urgent, red overdue.',
    placement: 'below',
  },
  {
    id: 'search',
    anchor: 'search-bar',
    tab: '/',
    title: 'Search and filter',
    body: 'Pull down a little on the list to reveal search; Filter narrows by urgency, category, or subject.',
    placement: 'below',
  },
  {
    id: 'daily',
    anchor: 'daily-header',
    tab: '/daily',
    title: 'Daily',
    body: 'Recurring tasks that reset every morning, plus everything due today. Check them off here — they stay off the calendar by design.',
    placement: 'below',
  },
  {
    id: 'calendar',
    anchor: 'calendar-bar',
    tab: '/calendar',
    title: 'Calendar',
    body: 'Tap any day for its timeline — events sized by duration, tasks lined up by time. The tray icon imports a CSV schedule (an AI prompt inside helps you make one).',
    placement: 'below',
  },
  {
    id: 'theme',
    anchor: 'theme-toggle',
    tab: '/settings',
    title: 'Yours to adjust',
    body: 'The sun/moon flips light and dark. Notifications, urgency window, calendar sync, and this tour again — all in Settings. Works fully offline; the dot by the title shows sync state.',
    placement: 'below',
  },
];
