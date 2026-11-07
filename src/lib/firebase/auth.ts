import { connectAuthEmulator, getAuth } from 'firebase/auth'

import { AUTH_EMULATOR_PORT, EMULATOR_HOST, firebaseApp, firebaseSettings } from './app'

/** The single Firebase Auth instance. Feature code uses `useAuth()` instead of importing this. */
export const auth = getAuth(firebaseApp)

// Google's account chooser and Auth messages in Turkish.
auth.languageCode = 'tr'

// `emulatorConfig` is set once connected, so a hot reload does not connect twice.
if (firebaseSettings.useEmulators && !auth.emulatorConfig) {
  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`, {
    disableWarnings: true,
  })
}
