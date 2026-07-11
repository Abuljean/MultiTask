// Bare-bones sign-up screen. Same deal as sign-in: plumbing now, design later.
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';

import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 6 characters)"
        autoComplete="new-password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {submitting ? (
        <ActivityIndicator />
      ) : (
        <Button
          title="Create account"
          onPress={signUp}
          disabled={!email.trim() || password.length < 6}
        />
      )}
      <Link href="/sign-in" style={styles.link}>
        Already have an account? Sign in
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 12 },
  input: { minHeight: 44, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  error: { color: '#dc2626' },
  notice: { color: '#16a34a' },
  link: { marginTop: 16, textAlign: 'center', color: '#3d4a7a' },
});
