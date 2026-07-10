// Bare-bones sign-in screen. Deliberately unstyled plumbing — the real design
// pass happens later, against docs/design/. Functionality only for now.
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';

import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
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
        placeholder="Password"
        autoComplete="current-password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {submitting ? (
        <ActivityIndicator />
      ) : (
        <Button title="Sign in" onPress={signIn} disabled={!email.trim() || !password} />
      )}
      <Link href="/sign-up" style={styles.link}>
        No account yet? Create one
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  error: { color: '#dc2626' },
  link: { marginTop: 16, textAlign: 'center', color: '#3d4a7a' },
});
