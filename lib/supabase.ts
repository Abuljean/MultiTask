// The single Supabase client for the whole app. Everything that talks to the
// backend goes through this one instance — auth state, task queries, all of it.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase config. Copy .env.example to .env, fill it in, and restart with `npx expo start -c`.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Sessions survive app restarts by living in AsyncStorage (the app's
    // local key-value store). Without this, you'd log in on every launch.
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // detectSessionInUrl is a web-only mechanism (reading tokens from the
    // page URL after an OAuth redirect); it must be off in React Native.
    detectSessionInUrl: false,
  },
});

// Access tokens expire (~1 hour) and need refreshing. Refresh while the app
// is in the foreground; stop when backgrounded so iOS/Android don't penalize
// us for background network activity. This is the pattern Supabase's Expo
// guide recommends.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
