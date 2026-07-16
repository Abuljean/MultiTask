// Mounts the quick-action wiring while signed in (the tabs layout), so a
// long-press "Quick add" lands straight in the quick-add sheet.
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { initQuickActions, teardownQuickActions } from '@/lib/quick-actions/system';

export function useQuickActions() {
  const router = useRouter();

  useEffect(() => {
    void initQuickActions((href) => router.push(href as never));
    return () => teardownQuickActions();
    // router identity churns; the gateway holds one live subscription anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
