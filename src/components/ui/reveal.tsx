import type { ReactNode } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

export interface RevealProps {
  children: ReactNode;
  /** Position in a list: staggers entrances so content settles top to bottom. */
  index?: number;
  style?: StyleProp<ViewStyle>;
}

const STAGGER_MS = 45;
const MAX_STAGGER = 8;
// On web, Reanimated keeps entering views absolutely positioned until the animation ends, which
// never happens on a screen mounted mid-transition. Content appears without motion there.
const ANIMATE = Platform.OS !== 'web';

/**
 * Entrance motion for content blocks: a short fade-and-rise, staggered by position. It follows
 * the system Reduce Motion setting. No layout transitions: they cost frames in long scroll views.
 */
export function Reveal({ children, index = 0, style }: RevealProps) {
  return (
    <Animated.View
      style={style}
      entering={
        ANIMATE
          ? FadeInDown.duration(320)
              .delay(Math.min(index, MAX_STAGGER) * STAGGER_MS)
              .withInitialValues({ transform: [{ translateY: 12 }] })
              .reduceMotion(ReduceMotion.System)
          : undefined
      }
    >
      {children}
    </Animated.View>
  );
}
