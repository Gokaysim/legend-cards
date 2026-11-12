import { getApp, getApps, initializeApp } from 'firebase/app'

import { parseFirebaseSettings } from './config'

const parsed = parseFirebaseSettings(import.meta.env)
if (!parsed.ok) {
  // main.tsx checks the settings first and shows ConfigErrorScreen, so this only fires if that check is bypassed.
  throw new Error(
    `Firebase settings are invalid: ${parsed.problems.map((p) => `${p.key} (${p.kind})`).join(', ')}`,
  )
}

/** The parsed Firebase settings of the running build. */
export const firebaseSettings = parsed.settings

/** The single Firebase app instance. Reused if it already exists, for example after a hot reload. */
export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: firebaseSettings.apiKey,
      authDomain: firebaseSettings.authDomain,
      projectId: firebaseSettings.projectId,
      appId: firebaseSettings.appId,
      storageBucket: firebaseSettings.storageBucket,
    })

/** Where the local emulators listen. Must match firebase.json. */
export const EMULATOR_HOST = '127.0.0.1'
export const AUTH_EMULATOR_PORT = 9099
export const FIRESTORE_EMULATOR_PORT = 8080
export const STORAGE_EMULATOR_PORT = 9199
