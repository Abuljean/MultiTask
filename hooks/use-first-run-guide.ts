// Opens the guide ONCE per device, the first time a signed-in session
// renders the tabs — covers fresh signups, migrated web users on their
// first app/web login, and new devices. The flag is per-device (AsyncStorage,
// like the theme preference) so a new phone gets the tour again; after that
// the guide lives in Settings.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/hooks/use-auth';

const SEEN_KEY = 'guide.seen';

export function useFirstRunGuide() {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const seen = await AsyncStorage.getItem(SEEN_KEY);
      if (seen || cancelled) return;
      await AsyncStorage.setItem(SEEN_KEY, '1');
      // Let the first frame of the task list land first — the guide should
      // open OVER the app, not instead of it.
      setTimeout(() => {
        if (!cancelled) router.push('/guide');
      }, 600);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
}
