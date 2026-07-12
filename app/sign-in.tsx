// Bare-bones sign-in screen. Deliberately unstyled plumbing — the real design
// pass happens later, against docs/design/. Themed just enough to be legible
// in dark mode (inputs were black-on-black on the web build).
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme/use-theme';

export default function SignInScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function signIn() {
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    // On success there is nothing to do here: the auth listener in
    // AuthProvider sees the new session and the Stack.Protected guard in
    // app/_layout.tsx swaps this screen out for the app automatically.
    if (error) {
      setError(error.message);
      setSubmitting(false);
    }
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Sign in</Text>
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
          placeholder="Password"
          placeholderTextColor={colors.textTertiary}
          autoComplete="current-password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={{ color: colors.statusOverdueAccent }}>{error}</Text> : null}
        {submitting ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Button
            title="Sign in"
            color={colors.accent}
            onPress={signIn}
            disabled={!email.trim() || !password}
          />
        )}
        <Link href="/sign-up" style={[styles.link, { color: colors.accent }]}>
          No account yet? Create one
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
