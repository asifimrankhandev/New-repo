import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { EvidenceFileError, validateEvidence } from './evidence-storage';

export type EvidenceSource = 'camera' | 'library' | 'file';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
}

function inferMimeType(name: string, fallback?: string | null): string {
  if (fallback) return fallback === 'image/jpg' ? 'image/jpeg' : fallback;
  const extension = name.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'heic':
      return 'image/heic';
    case 'pdf':
      return 'application/pdf';
    case 'txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Opens the system camera, photo picker or document picker. The photo picker needs no
 * library permission; the camera asks only when the user chooses it. Returns null on cancel.
 */
export async function pickEvidence(source: EvidenceSource): Promise<PickedFile | null> {
  let picked: PickedFile | null = null;

  if (source === 'file') {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'text/plain'],
      copyToCacheDirectory: true,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) {
      picked = {
        uri: asset.uri,
        name: asset.name,
        mimeType: inferMimeType(asset.name, asset.mimeType),
        size: asset.size ?? null,
      };
    }
  } else {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new EvidenceFileError(
          'unsupported',
          'Camera access is off. Allow it in Settings, or choose an existing photo instead.',
        );
      }
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.85,
      exif: false,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? null : result.assets[0];
    if (asset) {
      const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
      picked = {
        uri: asset.uri,
        name,
        mimeType: inferMimeType(name, asset.mimeType),
        size: asset.fileSize ?? null,
      };
    }
  }

  if (picked && picked.size !== null) validateEvidence(picked.mimeType, picked.size);
  return picked;
}
