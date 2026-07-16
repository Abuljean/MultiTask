// Pure form logic for the auth screens (sign-in / sign-up): field validation
// and the Supabase-error → human-message mapping. Kept out of the components
// so it's unit-testable and shared by both screens.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Null when valid, otherwise the message to show under the field. */
export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Enter your email.';
  if (!EMAIL_RE.test(trimmed)) return 'That doesn’t look like an email address.';
  return null;
}

/**
 * Null when valid. Sign-in only needs non-empty (the server decides);
 * sign-up enforces Supabase's 6-character minimum client-side.
 */
export function validatePassword(password: string, opts: { isNew: boolean }): string | null {
  if (!password) return opts.isNew ? 'Enter a password.' : 'Enter your password.';
  if (opts.isNew && password.length < 6) return 'Password needs at least 6 characters.';
  return null;
}

type AuthErrorLike = { code?: string; message?: string } | Error | undefined | null;

const BY_CODE: Record<string, string> = {
  invalid_credentials: 'Email or password is incorrect.',
  email_not_confirmed: 'Confirm your email first — the link is in your inbox.',
  user_already_exists: 'An account with this email already exists — sign in instead.',
  email_exists: 'An account with this email already exists — sign in instead.',
  over_request_rate_limit: 'Too many attempts — wait a minute, then try again.',
  over_email_send_rate_limit: 'Too many attempts — wait a minute, then try again.',
  weak_password: 'Password needs at least 6 characters.',
};

/**
 * Turn a Supabase auth error (or a fetch failure) into calm, actionable copy.
 * Falls back to the raw server message rather than hiding information.
 */
export function friendlyAuthError(error: AuthErrorLike): string {
  const code = error && 'code' in error ? (error as { code?: string }).code : undefined;
  if (code && BY_CODE[code]) return BY_CODE[code];

  const message = error?.message ?? '';
  if (/invalid login credentials/i.test(message)) return BY_CODE.invalid_credentials;
  if (/email not confirmed/i.test(message)) return BY_CODE.email_not_confirmed;
  if (/already registered|already exists/i.test(message)) return BY_CODE.user_already_exists;
  if (/rate limit/i.test(message)) return BY_CODE.over_request_rate_limit;
  if (/failed to fetch|network request failed|network error/i.test(message)) {
    return 'Can’t reach the server — check your connection.';
  }
  return message || 'Something went wrong — try again.';
}
