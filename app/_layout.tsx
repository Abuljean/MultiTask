import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

// One QueryClient for the app's lifetime (module scope, NOT inside the
// component — recreating it on re-render would wipe the cache).
const queryClient = new QueryClient();

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

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootNavigator />
          <StatusBar style="auto" />
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
