import {
  clearIndexedDbPersistence,
  connectFirestoreEmulator,
  type Firestore,
  FirestoreError,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from 'firebase/firestore'

import { EMULATOR_HOST, FIRESTORE_EMULATOR_PORT, firebaseApp, firebaseSettings } from './app'

/**
 * Deletes the IndexedDB cache that earlier versions kept on the device (design D2 of
 * drop-persistent-cache-and-dm-own-entry-query). The SDK allows this only before the instance starts, so it runs right
 * after creation. A failure, for example an old tab that still holds the database open, leaves an unused database
 * behind and is ignored.
 */
function clearOldCache(instance: Firestore): void {
  const report = (error: unknown) => {
    console.info('Could not delete the old Firestore cache; it stays unused', error)
  }
  try {
    clearIndexedDbPersistence(instance).catch(report)
  } catch (error) {
    report(error)
  }
}

function createFirestore(): Firestore {
  try {
    // The cache lives in memory, only as long as the open app (design D1 of drop-persistent-cache-and-dm-own-entry-query):
    // a wrong cached state never outlives a reload, and each tab has its own.
    const instance = initializeFirestore(firebaseApp, { localCache: memoryLocalCache() })
    if (firebaseSettings.useEmulators) {
      connectFirestoreEmulator(instance, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT)
    }
    clearOldCache(instance)
    return instance
  } catch (error) {
    // Already initialized, for example after a hot module reload in development: reuse it.
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      return getFirestore(firebaseApp)
    }
    throw error
  }
}

/** The single Firestore instance. Only `src/lib/firestore` and feature `api.ts` modules use it. */
export const db = createFirestore()
