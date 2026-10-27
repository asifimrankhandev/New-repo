import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/theme/use-theme';

import { getEvidenceFile, isImageMimeType } from '../evidence-storage';

export interface EvidenceThumbnailProps {
  storedFileName?: string;
  /** Preview a picked file before it is stored. */
  uri?: string;
  mimeType: string;
  height?: number;
  accessibilityLabel: string;
}

export function EvidenceThumbnail({
  storedFileName,
  uri,
  mimeType,
  height = 108,
  accessibilityLabel,
}: EvidenceThumbnailProps) {
  const { colors } = useTheme();
  const file = storedFileName ? getEvidenceFile(storedFileName) : null;
  const source = uri ?? file?.uri;
  const missing = file !== null && !file.exists;

  if (source && !missing && isImageMimeType(mimeType)) {
    return (
      <Image
        source={{ uri: source }}
        contentFit="cover"
        style={[styles.box, { height, backgroundColor: colors.surfaceMuted }]}
        accessible
        accessibilityLabel={accessibilityLabel}
      />
    );
  }
  return (
    <View
      accessible
      accessibilityLabel={missing ? `${accessibilityLabel}, file missing` : accessibilityLabel}
      style={[styles.box, styles.placeholder, { height, backgroundColor: colors.surfaceMuted }]}
    >
      <Icon name={missing ? 'info' : 'document'} size={28} color={colors.muted} />
      <AppText variant="label" tone="muted">
        {missing ? 'File missing' : mimeType === 'application/pdf' ? 'PDF' : 'Text'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 6 },
});
