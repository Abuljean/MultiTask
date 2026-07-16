// Sign-in — designed pass (was the bare placeholder). Layout/visuals live in
// components/auth-form.tsx; validation + error copy in lib/auth/form.ts.
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthButton, AuthField, AuthMessage, AuthScreen } from '@/components/auth-form';
import { friendlyAuthError, validateEmail, validatePassword } from '@/lib/auth/form';
import { supabase } from '@/lib/supabase';
import { space, type } from '@/lib/theme/tokens';
import { useTheme } from '@/lib/theme/use-theme';

export default function SignInScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function signIn() {
    const emailProblem = validateEmail(email);
    const passwordProblem = validatePassword(password, { isNew: false });
    setEmailError(emailProblem);
    setPasswordError(passwordProblem);
    if (emailProblem || passwordProblem) return;

    setSubmitting(true);
    setServerError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      // On success there is nothing to do here: the auth listener in
      // AuthProvider sees the new session and the Stack.Protected guard in
      // app/_layout.tsx swaps this screen out for the app automatically.
      if (error) {
        setServerError(friendlyAuthError(error));
        setSubmitting(false);
      }
    } catch (e) {
      setServerError(friendlyAuthError(e as Error));
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen title="Sign in">
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
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={signIn}
      />
      {serverError ? <AuthMessage kind="error" text={serverError} /> : null}
      <AuthButton label="Sign in" onPress={signIn} loading={submitting} />
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          No account yet?{' '}
          <Link href="/sign-up" style={{ color: colors.accent, fontWeight: '600' }}>
            Create one
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
