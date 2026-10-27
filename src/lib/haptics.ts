import {
  impactAsync,
  ImpactFeedbackStyle,
  notificationAsync,
  NotificationFeedbackType,
  selectionAsync,
} from 'expo-haptics';
import { Platform } from 'react-native';

const SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

/** Fire-and-forget: haptics are a nicety and must never surface an error. */
function run(effect: () => Promise<void>) {
  if (SUPPORTED) effect().catch(() => undefined);
}

export const haptics = {
  /** Primary button presses. */
  tap: () => run(() => impactAsync(ImpactFeedbackStyle.Light)),
  /** Changing a choice: chips, segments, switches. */
  select: () => run(selectionAsync),
  /** A record was saved. */
  success: () => run(() => notificationAsync(NotificationFeedbackType.Success)),
  /** Before a destructive confirmation. */
  warning: () => run(() => notificationAsync(NotificationFeedbackType.Warning)),
};
