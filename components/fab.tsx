// The quick-add FAB — the ONE primary action on the task list (docs/design/02:
// one primary per screen). Bottom-right, accent-filled, and one of the few
// elements allowed a real shadow (it IS elevated).
import { Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/lib/theme/use-theme';

export function Fab({
  onPress,
  bottom,
  right = 20,
}: {
  onPress: () => void;
  bottom: number;
  /** Desktop passes a larger inset — hugging the corner reads cramped there. */
  right?: number;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add task"
      style={({ pressed }) => [
        styles.fab,
        {
          bottom,
          right,
          backgroundColor: colors.accent,
          transform: [{ scale: pressed ? 0.9 : 1 }],
        },
      ]}>
      <IconSymbol name="plus" size={26} color={colors.textOnAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
