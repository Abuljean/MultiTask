// Sync-state indicator (docs/design/02): a small, calm dot — never blocks
// content, never alarms. Colors picked by the developer after the first
// on-device sync test (2026-07-15): BLUE = live, RED = offline — but offline
// stays an OUTLINED ring + caption (solid red would read as an error, and
// offline is expected, not an error; red also belongs to overdue). Static
// colors instead of a pulse (reduced-motion-safe by construction).
//   filled blue dot      = synced and live
//   filled accent dot    = actively syncing
//   red ring + "offline" = offline (local-first keeps working)
// Renders nothing in online mode (Expo Go), where sync doesn't exist.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSyncStatus } from '@/hooks/use-sync-status';
import { reconnectSync } from '@/lib/sync/system';
import { useTheme } from '@/lib/theme/use-theme';

export function SyncStatusDot() {
  const status = useSyncStatus();
  const { colors, type } = useTheme();

  if (!status) return null;

  const label = status.connected ? (status.busy ? 'Syncing' : 'Synced') : 'Offline';

  return (
    <Pressable
      // Tapping the dot while offline forces a reconnect attempt — the
      // escape hatch when the network is back but the retry backoff isn't.
      onPress={status.connected ? undefined : () => reconnectSync()}
      hitSlop={10}
      style={styles.row}
      accessibilityRole={status.connected ? 'text' : 'button'}
      accessibilityLabel={`Sync status: ${label.toLowerCase()}${status.connected ? '' : '. Tap to retry now.'}`}>
      {!status.connected && (
        <Text style={[type.caption, { color: colors.textSecondary, fontWeight: '400' }]}>offline</Text>
      )}
      <View
        style={[
          styles.dot,
          status.connected
            ? { backgroundColor: status.busy ? colors.accent : colors.statusEventAccent }
            : { borderWidth: 1.5, borderColor: colors.statusOverdueAccent },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
