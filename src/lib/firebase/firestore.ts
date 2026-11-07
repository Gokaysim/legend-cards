import {
  connectFirestoreEmulator,
  type Firestore,
  FirestoreError,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

import { EMULATOR_HOST, FIRESTORE_EMULATOR_PORT, firebaseApp, firebaseSettings } from './app'

function createFirestore(): Firestore {
  try {
    // Offline cache in IndexedDB, shared by every open tab of the app.
    const instance = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
    if (firebaseSettings.useEmulators) {
      connectFirestoreEmulator(instance, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT)
    }
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
