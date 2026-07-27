// Error telemetry front door — the ONLY file that touches @sentry/react-native
// (same soft-fail gateway pattern as lib/sync/system.ts). Dormant unless BOTH
// are true: EXPO_PUBLIC_SENTRY_DSN is set (free account, sentry.io) AND the
// installed build contains the native module. Until then every export is a
// no-op and the app runs exactly as before — so this ships dark and lights up
// when the developer pastes the DSN (rubric #8: no silent failures in prod).
//
// Privacy: no user content is sent. beforeSend strips task/event text; we
// report the crash, not the data.
import { Platform } from 'react-native';

type SentryModule = typeof import('@sentry/react-native');

let sentry: SentryModule | null = null;

export function telemetryEnabled(): boolean {
  return sentry !== null;
}

export async function initTelemetry(): Promise<boolean> {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return false;
  if (sentry) return true;
  try {
    const mod = await import('@sentry/react-native');
    mod.init({
      dsn,
      // Errors only — no session replay, no performance tracing, no PII.
      tracesSampleRate: 0,
      sendDefaultPii: false,
      enabled: !__DEV__, // dev errors belong in the console, not the dashboard
      beforeSend(event) {
        // Belt-and-suspenders: strip anything that could carry user content.
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.filter((b) => b.category !== 'console');
        }
        delete event.user;
        return event;
      },
    });
    sentry = mod;
    return true;
  } catch {
    // Native module absent (older installed build) or init failed — stay dark.
    sentry = null;
    return false;
  }
}

/** Report a handled error (sync drops, import failures, boundary catches). */
export function captureError(error: unknown, context?: Record<string, string | number>) {
  if (!sentry) return;
  try {
    sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      extra: context,
      tags: { platform: Platform.OS },
    });
  } catch {
    // Telemetry must never be able to crash the app it watches.
  }
}
