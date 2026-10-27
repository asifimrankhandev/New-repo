import type { TextStyle } from 'react-native';

import { fonts } from './tokens';

export const typography = {
  /** Hero amounts on Home. */
  display: { fontFamily: fonts.semibold, fontSize: 64, lineHeight: 64, letterSpacing: -3.2 },
  /** Screen titles. */
  title: { fontFamily: fonts.semibold, fontSize: 38, lineHeight: 40, letterSpacing: -1.8 },
  /** Wizard questions and sheet titles. */
  headline: { fontFamily: fonts.semibold, fontSize: 32, lineHeight: 35, letterSpacing: -1.3 },
  heading: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 27, letterSpacing: -0.6 },
  subheading: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.3 },
  bodyLarge: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  small: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  /** Uppercase monospace section labels. */
  label: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  mono: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 18 },
  amount: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 23,
    fontVariant: ['tabular-nums'],
  },
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
