// Starts the INTERACTIVE tour once per device, the first time a signed-in
// session renders the tabs — fresh signups, migrated web users on their
// first login, and new devices all get it. Per-device flag (AsyncStorage,
// like the theme preference) so a new phone tours again. The static guide
// (app/guide.tsx) stays under Settings > Help; "Replay the tour" is there
// too. MUST be called inside TourProvider (the tabs layout mounts it there).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

import { useTour } from '@/components/tour/tour-context';
import { useAuth } from '@/hooks/use-auth';

const SEEN_KEY = 'tour.seen';
// The v1 static-guide flag — anyone who already saw that shouldn't get
// re-onboarded just because the mechanism upgraded.
const LEGACY_SEEN_KEY = 'guide.seen';

export function useFirstRunGuide() {
  const { session } = useAuth();
  const { start } = useTour();

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const [seen, legacySeen] = await Promise.all([
        AsyncStorage.getItem(SEEN_KEY),
        AsyncStorage.getItem(LEGACY_SEEN_KEY),
      ]);
      if (seen || legacySeen || cancelled) return;
      await AsyncStorage.setItem(SEEN_KEY, '1');
      // Let the first frame of the task list land before dimming it.
      setTimeout(() => {
        if (!cancelled) start();
      }, 900);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
}
