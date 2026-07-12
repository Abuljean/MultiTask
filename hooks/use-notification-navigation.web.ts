// WEB no-op for notification deep-linking: scheduled notifications are
// native-only, and expo-notifications' useLastNotificationResponse THROWS
// on web in production bundles ("getLastNotificationResponse is not
// available on web"). Metro resolves this file instead of the native one
// when bundling for web.
export function useNotificationNavigation() {
  // Nothing to do on web.
}
