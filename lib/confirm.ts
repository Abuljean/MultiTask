// Cross-platform confirmation dialog. RN's Alert.alert is a silent NO-OP on
// web — destructive confirms would simply never fire — so web gets the
// browser's native confirm() while native keeps the platform alert.
import { Alert, Platform } from 'react-native';

export function confirmDialog(options: {
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    const g = globalThis as { confirm?: (message: string) => boolean };
    const text = options.message ? `${options.title}\n\n${options.message}` : options.title;
    return Promise.resolve(g.confirm ? g.confirm(text) : true);
  }
  return new Promise((resolve) => {
    Alert.alert(options.title, options.message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      {
        text: options.confirmLabel,
        style: options.destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
