import { Alert } from 'react-native';

/** Native confirmation dialog as a promise; resolves true when the user confirms. */
export function confirm(options: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      options.title,
      options.message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: options.confirmLabel,
          style: options.destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** Shows a user-facing error without leaking internals; details stay out of logs and analytics. */
export function showError(title: string, error: unknown, fallback = 'Please try again.') {
  const message = error instanceof Error && error.name !== 'Error' ? error.message : fallback;
  Alert.alert(title, message);
}
