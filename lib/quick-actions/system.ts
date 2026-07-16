// Home-screen quick actions (long-press the app icon), behind the same
// soft-fail gateway pattern as lib/sync/system.ts and lib/device-calendar.
// IMPORTANT: expo-quick-actions calls requireNativeModule at module scope,
// so even a static JS import crashes a build whose binary lacks the native
// module — every touch, including the router wiring, stays behind dynamic
// import() here. The current installed build simply reports false and the
// app runs on.
import { Platform } from 'react-native';

let subscription: { remove: () => void } | null = null;

/** Register the "Quick add" action and route action presses (warm + cold
 *  start) through the supplied navigator. Returns availability. */
export async function initQuickActions(navigate: (href: string) => void): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const QuickActions = await import('expo-quick-actions');

    // Runtime registration covers Android (static config is iOS-only in the
    // plugin); on iOS it harmlessly overwrites the identical static action.
    await QuickActions.setItems([
      {
        id: 'quick-add',
        title: 'Quick add',
        icon: Platform.OS === 'ios' ? 'symbol:plus' : undefined,
        params: { href: '/quick-add' },
      },
    ]);

    const initialHref = QuickActions.initial?.params?.href;
    if (typeof initialHref === 'string') {
      // Cold start from the shortcut: let the router settle first.
      setTimeout(() => navigate(initialHref), 0);
    }

    subscription?.remove();
    subscription = QuickActions.addListener((action) => {
      const href = action?.params?.href;
      if (typeof href === 'string') navigate(href);
    });
    return true;
  } catch {
    return false;
  }
}

export function teardownQuickActions(): void {
  subscription?.remove();
  subscription = null;
}
