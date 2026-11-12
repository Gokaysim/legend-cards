import { connectStorageEmulator, type FirebaseStorage, getStorage } from 'firebase/storage'

import { EMULATOR_HOST, firebaseApp, firebaseSettings, STORAGE_EMULATOR_PORT } from './app'
import { pictureAddress, type PictureLocation } from './pictureAddress'

/**
 * How long an upload or a delete may keep retrying. The SDK's default is 10 minutes; a definition step waits for its
 * upload, so a lost connection should fail the save instead of holding the form (design D6).
 */
const RETRY_TIME_MS = 30_000

function createStorage(): FirebaseStorage {
  const instance = getStorage(firebaseApp)
  instance.maxUploadRetryTime = RETRY_TIME_MS
  instance.maxOperationRetryTime = RETRY_TIME_MS
  if (firebaseSettings.useEmulators) {
    connectStorageEmulator(instance, EMULATOR_HOST, STORAGE_EMULATOR_PORT)
  }
  return instance
}

/** The single Cloud Storage instance. Only this module and `definitions/api.ts` use it. */
export const storage = createStorage()

/** Where this build's pictures are served from. */
export const PICTURE_LOCATION: PictureLocation = {
  bucket: firebaseSettings.storageBucket,
  emulatorOrigin: firebaseSettings.useEmulators
    ? `http://${EMULATOR_HOST}:${STORAGE_EMULATOR_PORT}`
    : null,
}

/** A stored picture's address in this build. */
export function storedPictureUrl(path: string): string {
  return pictureAddress(PICTURE_LOCATION, path)
}
