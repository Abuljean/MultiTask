// The current local DATE as state (start-of-day; identity changes only when
// the date does). Fixes REVIEW-REPORT deferred #13: "Today"/"Tomorrow"
// groupings, the Daily view, and the calendar's today-circle went stale when
// the app sat open across midnight (or resumed days later) — nothing
// re-rendered because nothing changed. Two triggers cover both paths: a
// timer armed for just past the next midnight, and an AppState-active check
// for resumes from the background.
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { msUntilNextMidnight, startOfDay } from '@/lib/today';

export function useToday(): Date {
  const [today, setToday] = useState(() => startOfDay(new Date()));

  useEffect(() => {
    const check = () =>
      setToday((prev) => {
        const current = startOfDay(new Date());
        return current.getTime() === prev.getTime() ? prev : current;
      });

    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      timer = setTimeout(() => {
        check();
        arm();
      }, msUntilNextMidnight(new Date()) + 1000);
    };
    arm();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return today;
}
