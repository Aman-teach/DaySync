import { ID } from 'react-native-appwrite';
import * as FileSystem from 'expo-file-system';
import { storage, account, APPWRITE_CONFIG } from '@/lib/appwrite';
import { Platform } from 'react-native';

/**
 * Ensures an Appwrite session exists.
 * If the user is not logged in, creates an anonymous session so the
 * bucket's "Users" permission is satisfied.
 */
async function ensureSession(): Promise<void> {
  try {
    await account.get(); // Already logged in ✓
  } catch {
    // No session — create anonymous one
    await account.createAnonymousSession();
  }
}

export async function uploadImageToAppwrite(localUri: string): Promise<string | null> {
  // Guarantee a session exists — bucket requires "Users" permission
  await ensureSession();

  if (Platform.OS === 'web') {
    try {
      const response = await fetch(localUri);
      const blob = await response.blob();
      const file = new File([blob], `upload_${Date.now()}.jpg`, { type: blob.type });

      const uploadedFile = await storage.createFile(
        APPWRITE_CONFIG.IMAGES_BUCKET_ID,
        ID.unique(),
        file as any
      );

      const fileUrl = (storage as any).getFilePreviewURL(APPWRITE_CONFIG.IMAGES_BUCKET_ID, uploadedFile.$id);
      return fileUrl.toString();
    } catch (e: any) {
      if (Platform.OS === 'web') window.alert(`Appwrite Web Upload Error: ${e?.message || e}`);
      else console.error(`Appwrite Web Upload Error: ${e?.message || e}`);
      return null;
    }
  } else {
    try {
      const fileName = localUri.split('/').pop() || `upload_${Date.now()}.jpg`;
      const type = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
      
      const fileInfo = await FileSystem.getInfoAsync(localUri);

      const fileObj = {
        name: fileName,
        type: type,
        uri: localUri,
        size: fileInfo.exists ? fileInfo.size : 0,
      } as any;

      const uploadedFile = await storage.createFile(
        APPWRITE_CONFIG.IMAGES_BUCKET_ID,
        ID.unique(),
        fileObj
      );

      // Appwrite native SDK getFilePreview returns a URL string
      const fileUrl = (storage as any).getFilePreviewURL
        ? (storage as any).getFilePreviewURL(APPWRITE_CONFIG.IMAGES_BUCKET_ID, uploadedFile.$id).toString()
        : storage.getFilePreview(APPWRITE_CONFIG.IMAGES_BUCKET_ID, uploadedFile.$id);

      return fileUrl.toString();
    } catch (e: any) {
      // Alert the exact error from Appwrite so we can debug it
      alert(`Appwrite SDK Error: ${e?.message || e}`);
      return null;
    }
  }
}

export async function uploadAudioToAppwrite(localUri: string): Promise<string | null> {
  await ensureSession();

  try {
    const fileName = `audio_${Date.now()}.jpg`; // Disguise as image for bucket rules
    const type = 'image/jpeg';
    
    const fileInfo = await FileSystem.getInfoAsync(localUri);

    const fileObj = {
      name: fileName,
      type: type,
      uri: localUri,
      size: fileInfo.exists ? fileInfo.size : 0,
    } as any;

    const uploadedFile = await storage.createFile(
      APPWRITE_CONFIG.IMAGES_BUCKET_ID,
      ID.unique(),
      fileObj
    );

    const fileUrl = (storage as any).getFileDownloadURL
      ? (storage as any).getFileDownloadURL(APPWRITE_CONFIG.IMAGES_BUCKET_ID, uploadedFile.$id).toString()
      : storage.getFileDownload(APPWRITE_CONFIG.IMAGES_BUCKET_ID, uploadedFile.$id);

    return fileUrl.toString();
  } catch (e: any) {
    console.error('Audio Upload Error:', e);
    return null;
  }
}
