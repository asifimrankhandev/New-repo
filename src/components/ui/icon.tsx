import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

type SymbolName = Extract<SymbolViewProps['name'], { ios?: unknown }>;

/** One vocabulary of icons, mapped to SF Symbols on iOS and Material Symbols on Android. */
const ICONS = {
  add: { ios: 'plus', android: 'add' },
  archive: { ios: 'archivebox', android: 'archive' },
  attach: { ios: 'paperclip', android: 'attach_file' },
  back: { ios: 'chevron.left', android: 'arrow_back' },
  bell: { ios: 'bell', android: 'notifications' },
  bellOff: { ios: 'bell.slash', android: 'notifications_off' },
  calendar: { ios: 'calendar', android: 'calendar_month' },
  camera: { ios: 'camera', android: 'photo_camera' },
  cases: { ios: 'rectangle.stack', android: 'inbox' },
  check: { ios: 'checkmark', android: 'check' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  clock: { ios: 'clock', android: 'schedule' },
  close: { ios: 'xmark', android: 'close' },
  copy: { ios: 'doc.on.doc', android: 'content_copy' },
  document: { ios: 'doc.text', android: 'description' },
  edit: { ios: 'pencil', android: 'edit' },
  filter: { ios: 'line.3.horizontal.decrease', android: 'tune' },
  info: { ios: 'info.circle', android: 'info' },
  more: { ios: 'ellipsis', android: 'more_horiz' },
  next: { ios: 'arrow.right', android: 'arrow_forward' },
  photo: { ios: 'photo', android: 'image' },
  receipt: { ios: 'doc.plaintext', android: 'receipt_long' },
  search: { ios: 'magnifyingglass', android: 'search' },
  settings: { ios: 'gearshape', android: 'settings' },
  share: { ios: 'square.and.arrow.up', android: 'ios_share' },
  shield: { ios: 'lock.shield', android: 'shield' },
  trash: { ios: 'trash', android: 'delete' },
  truck: { ios: 'shippingbox', android: 'local_shipping' },
  unarchive: { ios: 'tray.and.arrow.up', android: 'unarchive' },
} as const satisfies Record<string, SymbolName>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color: ColorValue;
  style?: StyleProp<ViewStyle>;
}

/** Decorative by default: pair it with visible text or an `accessibilityLabel` on the control. */
export function Icon({ name, size = 22, color, style }: IconProps) {
  return (
    <SymbolView
      name={ICONS[name]}
      size={size}
      tintColor={color}
      style={[{ width: size, height: size }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
