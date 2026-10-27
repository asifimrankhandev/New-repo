import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/use-theme';

export interface SegmentBarProps {
  total: number;
  filled: number;
  /** Highlights the segment after the last filled one (the current stage). */
  highlightNext?: boolean;
  height?: number;
  accessibilityLabel: string;
}

export function SegmentBar({
  total,
  filled,
  highlightNext = false,
  height = 4,
  accessibilityLabel,
}: SegmentBarProps) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: total, now: filled }}
      style={styles.row}
    >
      {Array.from({ length: total }, (_, index) => {
        const color =
          index < filled
            ? colors.ink
            : highlightNext && index === filled
              ? colors.accent
              : colors.line;
        return <View key={index} style={[styles.segment, { height, backgroundColor: color }]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3, flex: 1 },
  segment: { flex: 1 },
});
