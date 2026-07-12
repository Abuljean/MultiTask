// Bare-bones sign-up screen. Same deal as sign-in: plumbing now, design later.
// Themed just enough to be legible in dark mode.
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme/use-theme';

export default function SignUpScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function signUp() {
    setSubmitting(true);
    setError(null);
    setNotice(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }
    if (!data.session) {
      // Email confirmation is enabled in Supabase: no session until the
      // link in the email is clicked. Tell the user what to do next.
      setNotice('Check your email for a confirmation link, then come back and sign in.');
      setSubmitting(false);
    }
    // If confirmation is disabled, data.session is set, the auth listener
    // fires, and the guard in app/_layout.tsx takes us into the app.
  }

  const inputStyle = [
    styles.input,
    {
      color: colors.textPrimary,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surfaceElevated,
    },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Create account</Text>
        <TextInput
          style={inputStyle}
          placeholder="Email"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={inputStyle}
          placeholder="Password (min 6 characters)"
          placeholderTextColor={colors.textTertiary}
          autoComplete="new-password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={{ color: colors.statusOverdueAccent }}>{error}</Text> : null}
        {notice ? <Text style={{ color: colors.statusOngoingAccent }}>{notice}</Text> : null}
        {submitting ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Button
            title="Create account"
            color={colors.accent}
            onPress={signUp}
            disabled={!email.trim() || password.length < 6}
          />
        )}
        <Link href="/sign-in" style={[styles.link, { color: colors.accent }]}>
          Already have an account? Sign in
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center' },
  container: { width: '100%', maxWidth: 420, alignSelf: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 12 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  link: { marginTop: 16, textAlign: 'center' },
});
