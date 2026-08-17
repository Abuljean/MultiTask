// The email-confirmation landing page. PUBLIC route on the web app - the
// sign-up confirm link points here (emailRedirectTo in app/sign-up.tsx).
// Job: look like Multitask instead of a bare web app root, and hand phone
// users straight back into the native app via the custom scheme. On the
// web the Supabase client has already consumed the tokens from the URL
// (detectSessionInUrl), so "Continue on the web" lands signed in.
//
// SETUP (one-time, Supabase dashboard): Auth > URL Configuration > Redirect
// URLs must include https://multitask-web.onrender.com/confirmed - Supabase
// refuses to redirect to URLs not on that list.
import { useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { AuthButton, AuthMessage, AuthScreen } from '@/components/auth-form';
import { space, type } from '@/lib/theme/tokens';
import { useTheme } from '@/lib/theme/use-theme';

const APP_LINK = 'multitask://sign-in?confirmed=1';

function isPhoneBrowser(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export default function ConfirmedScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const onPhone = isPhoneBrowser();

  function openApp() {
    // Custom-scheme navigation must come from a user gesture on iOS Safari,
    // hence a button rather than an auto-redirect.
    if (typeof window !== 'undefined') window.location.href = APP_LINK;
  }

  return (
    <AuthScreen title="Email confirmed">
      <AuthMessage kind="notice" text="Your account is ready." />
      {onPhone ? (
        <>
          <AuthButton label="Open the Multitask app" onPress={openApp} />
          <View style={styles.footer}>
            <Text
              style={[styles.footerText, { color: colors.accent, fontWeight: '600' }]}
              onPress={() => router.replace('/')}>
              Continue on the web instead
            </Text>
          </View>
        </>
      ) : (
        <>
          <AuthButton label="Continue to your tasks" onPress={() => router.replace('/')} />
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              On your phone, open the Multitask app and sign in.
            </Text>
          </View>
        </>
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: 'center', marginTop: space.s2 },
  footerText: { ...type.body, textAlign: 'center' },
});
