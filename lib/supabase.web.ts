// WEB variant of the Supabase client (Metro resolves this over supabase.ts
// when bundling for web). Two differences from native:
//   - detectSessionInUrl: TRUE — Supabase email links (confirm, password
//     recovery) land on the deployed site with tokens in the URL fragment;
//     the web client must pick them up or those links dead-end. (A proper
//     reset-password screen is web-phase work; this at least establishes
//     the session so the link isn't a brick.)
//   - No AppState/AsyncStorage: the browser tab lifecycle and localStorage
//     (supabase-js's web default) already cover persistence + refresh.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase config. Copy .env.example to .env, fill it in, and restart with `npx expo start -c`.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
