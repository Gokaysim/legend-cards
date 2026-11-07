/** Turkish messages for the Firebase Auth errors a user can run into while signing in. */
export const AUTH_ERROR_MESSAGES = {
  popupBlocked:
    'Tarayıcın giriş penceresini engelledi. Bu site için açılır pencerelere izin verip tekrar dene.',
  network: 'Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.',
  generic: 'Giriş yapılamadı. Lütfen tekrar dene.',
} as const

/** Reads a Firebase error code by shape: Firebase errors fail `instanceof` checks. */
function errorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null
  return typeof error.code === 'string' ? error.code : null
}

/**
 * The message to show for a failed sign-in, or `null` when nothing should be shown
 * (the user closed the Google window, or a newer popup replaced this one).
 */
export function authErrorMessage(error: unknown): string | null {
  switch (errorCode(error)) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null
    case 'auth/popup-blocked':
      return AUTH_ERROR_MESSAGES.popupBlocked
    case 'auth/network-request-failed':
      return AUTH_ERROR_MESSAGES.network
    default:
      return AUTH_ERROR_MESSAGES.generic
  }
}
