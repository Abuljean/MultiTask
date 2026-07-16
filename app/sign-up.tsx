// Sign-up — designed pass (was the bare placeholder). Layout/visuals live in
// components/auth-form.tsx; validation + error copy in lib/auth/form.ts.
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthButton, AuthField, AuthMessage, AuthScreen } from '@/components/auth-form';
import { friendlyAuthError, validateEmail, validatePassword } from '@/lib/auth/form';
import { supabase } from '@/lib/supabase';
import { space, type } from '@/lib/theme/tokens';
import { useTheme } from '@/lib/theme/use-theme';

export default function SignUpScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function signUp() {
    const emailProblem = validateEmail(email);
    const passwordProblem = validatePassword(password, { isNew: true });
    setEmailError(emailProblem);
    setPasswordError(passwordProblem);
    if (emailProblem || passwordProblem) return;

    setSubmitting(true);
    setServerError(null);
    setNotice(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) {
        setServerError(friendlyAuthError(error));
        setSubmitting(false);
        return;
      }
      if (!data.session) {
        // Email confirmation is on (a security invariant — see supabase/10):
        // no session until the emailed link is clicked.
        setNotice('Check your email for a confirmation link, then come back and sign in.');
        setSubmitting(false);
      }
      // With a session, the auth listener fires and the guard in
      // app/_layout.tsx takes us into the app.
    } catch (e) {
      setServerError(friendlyAuthError(e as Error));
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen title="Create account">
      <AuthField
        label="Email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (emailError) setEmailError(null);
        }}
        error={emailError}
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="next"
      />
      <AuthField
        label="Password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (passwordError) setPasswordError(null);
        }}
        error={passwordError}
        secure
        autoComplete="new-password"
        returnKeyType="go"
        onSubmitEditing={signUp}
      />
      {serverError ? <AuthMessage kind="error" text={serverError} /> : null}
      {notice ? <AuthMessage kind="notice" text={notice} /> : null}
      <AuthButton label="Create account" onPress={signUp} loading={submitting} />
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Already have an account?{' '}
          <Link href="/sign-in" style={{ color: colors.accent, fontWeight: '600' }}>
            Sign in
          </Link>
        </Text>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: 'center', marginTop: space.s2 },
  footerText: { ...type.body },
});
