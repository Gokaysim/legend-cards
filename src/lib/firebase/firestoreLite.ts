import type * as LiteModule from 'firebase/firestore/lite'
import type { Firestore } from 'firebase/firestore/lite'

type Lite = typeof LiteModule

let loaded: Promise<{ lite: Lite; db: Firestore }> | null = null

/**
 * Firestore Lite on the app's Firebase app, loaded and set up on first use. The app's settings load here too, so a
 * module that imports this one (a feature `api.ts`) does not need them until the first read.
 */
function loadLite(): Promise<{ lite: Lite; db: Firestore }> {
  loaded ??= Promise.all([import('firebase/firestore/lite'), import('./app')]).then(
    ([lite, app]) => {
      const { EMULATOR_HOST, FIRESTORE_EMULATOR_PORT, firebaseApp, firebaseSettings } = app
      const db = lite.getFirestore(firebaseApp)
      if (firebaseSettings.useEmulators) {
        lite.connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT)
      }
      return { lite, db }
    },
  )
  return loaded
}

/**
 * Whether the server holds the document at `collection/id`, read with Firestore Lite (design D4 of
 * drop-persistent-cache-and-dm-own-entry-query). Lite has no cache and no listeners: the read is one request to the
 * server with the signed-in account's token, so it shows what the server holds even when the main instance's cache or
 * an open listener says otherwise. Lite is loaded on the first call, so it stays out of the main bundle. Rejects with
 * the Firestore error when the read fails. Only feature `api.ts` modules call it.
 */
export async function existsOnServer(collection: string, id: string): Promise<boolean> {
  const { lite, db } = await loadLite()
  const snapshot = await lite.getDoc(lite.doc(db, collection, id))
  return snapshot.exists()
}
