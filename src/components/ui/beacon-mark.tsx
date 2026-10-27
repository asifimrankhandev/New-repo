import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/use-theme';
import { fonts, spacing } from '@/theme/tokens';

import { AppText } from './app-text';

/** Wordmark: orange beacon dot with a soft halo. */
export function BeaconMark() {
  const { colors } = useTheme();
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="header"
      accessibilityLabel="RefundBeacon"
    >
      <View style={[styles.halo, { backgroundColor: colors.accentHalo }]}>
        <View style={[styles.dot, { backgroundColor: colors.accent }]} />
      </View>
      <AppText variant="subheading" style={styles.word}>
        RefundBeacon
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  halo: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  word: { fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.4 },
});
