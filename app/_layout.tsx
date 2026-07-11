import { JetBrainsMono_500Medium, useFonts } from '@expo-google-fonts/jetbrains-mono';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { SyncBridge } from '@/components/sync-bridge';
import { UndoToastProvider } from '@/components/undo-toast';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { initNotifications } from '@/lib/notifications';

// One QueryClient for the app's lifetime (module scope, NOT inside the
// component — recreating it on re-render would wipe the cache).
const queryClient = new QueryClient();

// Foreground notification display + Android channel — once per process.
initNotifications();

export const unstable_settings = {
  anchor: '(tabs)',
};

// Stack.Protected mounts its screens only while `guard` is true, and
// automatically navigates away if the guard flips (e.g. session expires
// mid-use → back to sign-in; sign-in succeeds → into the app). This is
// expo-router v6's built-in auth pattern — no manual redirects needed.
function RootNavigator() {
  const { session, isLoading } = useAuth();

  // While the persisted session loads from disk (a few ms), render nothing —
  // the splash screen is still up, so the user never sees a flash of the
  // wrong screen.
  if (isLoading) {
    return null;
  }

  return (
    <Stack>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        {/* Quick-add and task-edit are transparent routes, NOT RN <Modal>s —
            Reanimated updates don't apply inside Modal's separate native
            window. Each route animates its own sheet; the list stays
            visible behind. */}
        <Stack.Screen
          name="quick-add"
          options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }}
        />
        <Stack.Screen
          name="task/[id]"
          options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }}
        />
        {/* Calendar day drill-down: transparent route with a custom ZOOM
            transition (the native stack has no zoom animation). */}
        <Stack.Screen
          name="day/[date]"
          options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }}
        />
        <Stack.Screen
          name="import-events"
          options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }}
        />
        <Stack.Screen
          name="import-help"
          options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }}
        />
        <Stack.Screen
          name="event/[id]"
          options={{ presentation: 'transparentModal', animation: 'none', headerShown: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // JetBrains Mono is the identity font for time chips (docs/design/03).
  // Hold the splash screen until it's ready so text never swaps mid-view.
  const [fontsLoaded] = useFonts({ JetBrainsMono_500Medium });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          {/* No-op in Expo Go; boots PowerSync in the dev build. */}
          <SyncBridge />
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <UndoToastProvider>
              <RootNavigator />
              <StatusBar style="auto" />
            </UndoToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
