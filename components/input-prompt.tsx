// Cross-platform text prompt dialog — Android's answer to iOS's native
// Alert.prompt (which simply doesn't exist there). A plain centered dialog:
// title, optional message, one input, Cancel/OK. Uses RN Modal with the
// native fade — safe here because nothing inside animates (the Modal
// animation bug only kills Reanimated/LayoutAnimation content).
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/lib/theme/use-theme';

export type PromptRequest = {
  title: string;
  message?: string;
  secure?: boolean;
};

type Props = {
  request: PromptRequest | null;
  onDone: (value: string | null) => void;
};

export function InputPromptDialog({ request, onDone }: Props) {
  const { colors, space, radius, type } = useTheme();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (request) setValue('');
  }, [request]);

  if (!request) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onDone(null)}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderSubtle,
              borderRadius: radius.card,
              padding: space.s4,
              gap: space.s3,
            },
          ]}>
          <Text style={[type.h2, { color: colors.textPrimary }]}>{request.title}</Text>
          {request.message && (
            <Text style={[type.body, { color: colors.textSecondary }]}>{request.message}</Text>
          )}
          <TextInput
            style={{
              minHeight: 44,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              borderRadius: radius.button,
              color: colors.textPrimary,
              paddingHorizontal: space.s3,
              fontSize: 15,
            }}
            value={value}
            onChangeText={setValue}
            secureTextEntry={request.secure}
            autoFocus
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={() => onDone(value.trim() || null)}
          />
          <View style={[styles.buttonRow, { gap: space.s5 }]}>
            <Pressable onPress={() => onDone(null)} accessibilityRole="button" hitSlop={8}>
              <Text style={[type.body, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => onDone(value.trim() || null)} accessibilityRole="button" hitSlop={8}>
              <Text style={[type.body, { color: colors.accent, fontWeight: '600' }]}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    borderWidth: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});
