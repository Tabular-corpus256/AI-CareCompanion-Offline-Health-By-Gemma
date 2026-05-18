import { Platform, Alert } from 'react-native';
import {
  request,
  PERMISSIONS,
  RESULTS,
  checkMultiple,
} from 'react-native-permissions';
import type { Permission, PermissionStatus } from 'react-native-permissions';
import { logError } from './logger';

function isGranted(status: PermissionStatus): boolean {
  return status === RESULTS.GRANTED || status === RESULTS.LIMITED;
}

async function checkAndRequest(
  perms: Permission[],
  title: string,
  message: string,
): Promise<boolean> {
  try {
    const statuses = await checkMultiple(perms);
    const allGranted = perms.every(p => isGranted(statuses[p]));
    if (allGranted) return true;

    const result = await request(perms[0]);

    if (isGranted(result)) return true;

    Alert.alert(title, message);
    return false;
  } catch (err) {
    logError('permissions.checkAndRequest', err, { perms });
    return false;
  }
}

export async function ensureMicrophonePermission(): Promise<boolean> {
  const perms = Platform.select({
    ios: [PERMISSIONS.IOS.MICROPHONE],
    android: [PERMISSIONS.ANDROID.RECORD_AUDIO],
    default: [],
  });
  if (perms.length === 0) return true;
  return checkAndRequest(
    perms,
    'Microphone Required',
    'Voice input needs microphone access. Please enable it in your device settings.',
  );
}

export async function ensureCameraPermission(): Promise<boolean> {
  const perms = Platform.select({
    ios: [PERMISSIONS.IOS.CAMERA],
    android: [PERMISSIONS.ANDROID.CAMERA],
    default: [],
  });
  if (perms.length === 0) return true;
  return checkAndRequest(
    perms,
    'Camera Required',
    'Camera access is needed for medical image capture. Please enable it in your device settings.',
  );
}

export async function ensurePhotoPermission(): Promise<boolean> {
  const perms = Platform.select({
    ios: [PERMISSIONS.IOS.PHOTO_LIBRARY],
    android: [PERMISSIONS.ANDROID.READ_MEDIA_IMAGES],
    default: [],
  });
  if (perms.length === 0) return true;
  return checkAndRequest(
    perms,
    'Photos Required',
    'Photo access is needed to upload medical documents. Please enable it in your device settings.',
  );
}
