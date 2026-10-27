/**
 * "Swiss Paper" design tokens. Every color pair used for text meets WCAG AA (4.5:1) on the
 * surfaces it appears on; accent orange is only used as a fill behind ink-colored text.
 */

export const palette = {
  light: {
    background: '#F4F4F1',
    surface: '#FFFFFF',
    surfaceMuted: '#EDEDE8',
    segmentTrack: '#E9E9E4',
    border: '#E4E4DE',
    line: '#DADAD4',
    ink: '#0F0F0F',
    onInk: '#FFFFFF',
    muted: '#5E5E5A',
    faint: '#9A9A94',
    accent: '#FF5A1F',
    onAccent: '#0F0F0F',
    accentHalo: 'rgba(255,90,31,0.18)',
    missingBackground: '#FFE1D4',
    missingText: '#7A2A0B',
    danger: '#A32613',
    dangerBorder: '#E8C7C0',
    inverseSurface: '#0F0F0F',
    inverseText: '#F4F4F1',
    inverseMuted: '#BDBDB5',
    inverseLine: '#2E2E2B',
    scrim: 'rgba(15,15,15,0.45)',
  },
  dark: {
    background: '#0E0E0D',
    surface: '#1A1A18',
    surfaceMuted: '#232320',
    segmentTrack: '#232320',
    border: '#2A2A27',
    line: '#2E2E2B',
    ink: '#F2F2EE',
    onInk: '#0E0E0D',
    muted: '#A3A39C',
    faint: '#6E6E68',
    accent: '#FF6A33',
    onAccent: '#0F0F0F',
    accentHalo: 'rgba(255,106,51,0.22)',
    missingBackground: '#3D1C0F',
    missingText: '#FFB899',
    danger: '#FF8A75',
    dangerBorder: '#4A2620',
    inverseSurface: '#F2F2EE',
    inverseText: '#0E0E0D',
    inverseMuted: '#4A4A46',
    inverseLine: '#D5D5CF',
    scrim: 'rgba(0,0,0,0.6)',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type ThemeColors = { [K in keyof (typeof palette)['light']]: string };

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 16,
  card: 22,
  sheet: 28,
  pill: 999,
} as const;

/** Custom fonts don't synthesize weights on Android, so each weight is its own family. */
export const fonts = {
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semibold: 'InterTight_600SemiBold',
  bold: 'InterTight_700Bold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
} as const;

/** Minimum touch target from the platform accessibility guidelines. */
export const MIN_TOUCH_TARGET = 44;
