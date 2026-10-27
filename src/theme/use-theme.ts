import { useColorScheme } from 'react-native';

import { type ColorScheme, palette, type ThemeColors } from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
}

/** Follows the system scheme; the Appearance setting overrides it via `Appearance.setColorScheme`. */
export function useTheme(): Theme {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: palette[scheme] };
}
