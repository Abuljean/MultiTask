import { friendlyAuthError, validateEmail, validatePassword } from '../form';

describe('validateEmail', () => {
  it('accepts a normal address', () => {
    expect(validateEmail('dev@example.com')).toBeNull();
  });

  it('trims surrounding whitespace before validating', () => {
    expect(validateEmail('  dev@example.com  ')).toBeNull();
  });

  it('rejects an empty field with a specific message', () => {
    expect(validateEmail('')).toBe('Enter your email.');
    expect(validateEmail('   ')).toBe('Enter your email.');
  });

  it('rejects malformed addresses', () => {
    expect(validateEmail('not-an-email')).toBe('That doesn’t look like an email address.');
    expect(validateEmail('missing@tld')).toBe('That doesn’t look like an email address.');
    expect(validateEmail('@nouser.com')).toBe('That doesn’t look like an email address.');
    expect(validateEmail('spaces in@mail.com')).toBe('That doesn’t look like an email address.');
  });

  it('accepts subdomains and plus addressing', () => {
    expect(validateEmail('a.b+tag@mail.co.uk')).toBeNull();
  });
});

describe('validatePassword', () => {
  it('sign-in: only requires non-empty', () => {
    expect(validatePassword('x', { isNew: false })).toBeNull();
    expect(validatePassword('', { isNew: false })).toBe('Enter your password.');
  });

  it('sign-up: requires at least 6 characters (Supabase default)', () => {
    expect(validatePassword('12345', { isNew: true })).toBe(
      'Password needs at least 6 characters.'
    );
    expect(validatePassword('123456', { isNew: true })).toBeNull();
    expect(validatePassword('', { isNew: true })).toBe('Enter a password.');
  });
});

describe('friendlyAuthError', () => {
  it('maps invalid credentials by code', () => {
    expect(friendlyAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(
      'Email or password is incorrect.'
    );
  });

  it('maps invalid credentials by message when code is absent', () => {
    expect(friendlyAuthError({ message: 'Invalid login credentials' })).toBe(
      'Email or password is incorrect.'
    );
  });

  it('maps unconfirmed email', () => {
    expect(friendlyAuthError({ code: 'email_not_confirmed', message: 'Email not confirmed' })).toBe(
      'Confirm your email first — the link is in your inbox.'
    );
  });

  it('maps already-registered on sign-up', () => {
    expect(friendlyAuthError({ code: 'user_already_exists', message: 'User already registered' })).toBe(
      'An account with this email already exists — sign in instead.'
    );
    expect(friendlyAuthError({ message: 'User already registered' })).toBe(
      'An account with this email already exists — sign in instead.'
    );
  });

  it('maps rate limiting', () => {
    expect(friendlyAuthError({ code: 'over_request_rate_limit', message: 'Rate limit exceeded' })).toBe(
      'Too many attempts — wait a minute, then try again.'
    );
  });

  it('maps weak password server rejections', () => {
    expect(friendlyAuthError({ code: 'weak_password', message: 'Password should be at least 6 characters' })).toBe(
      'Password needs at least 6 characters.'
    );
  });

  it('maps network failures', () => {
    expect(friendlyAuthError(new TypeError('Failed to fetch'))).toBe(
      'Can’t reach the server — check your connection.'
    );
    expect(friendlyAuthError({ message: 'Network request failed' })).toBe(
      'Can’t reach the server — check your connection.'
    );
  });

  it('falls back to the raw message for unknown errors', () => {
    expect(friendlyAuthError({ message: 'Something exotic happened' })).toBe(
      'Something exotic happened'
    );
  });

  it('falls back to a generic line when there is no message at all', () => {
    expect(friendlyAuthError({})).toBe('Something went wrong — try again.');
    expect(friendlyAuthError(undefined)).toBe('Something went wrong — try again.');
  });
});
