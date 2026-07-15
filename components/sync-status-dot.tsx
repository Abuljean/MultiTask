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
import { StyleSheet, Text, View } from 'react-native';

import { useSyncStatus } from '@/hooks/use-sync-status';
import { useTheme } from '@/lib/theme/use-theme';

export function SyncStatusDot() {
  const status = useSyncStatus();
  const { colors, type } = useTheme();

  if (!status) return null;

  const label = status.connected ? (status.busy ? 'Syncing' : 'Synced') : 'Offline';

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`Sync status: ${label.toLowerCase()}`}>
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
    </View>
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
