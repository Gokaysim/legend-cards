import { describe, expect, it } from 'vitest'

import { AUTH_ERROR_MESSAGES, authErrorMessage } from './authErrors'

/** Firebase errors are Error objects with a string `code`. */
function firebaseError(code: string): Error {
  return Object.assign(new Error(`Firebase: Error (${code}).`), { code })
}

describe('authErrorMessage', () => {
  it.each(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])(
    'shows nothing when the user cancels (%s)',
    (code) => {
      expect(authErrorMessage(firebaseError(code))).toBeNull()
    },
  )

  it('asks the user to allow pop-ups when the popup is blocked', () => {
    const message = authErrorMessage(firebaseError('auth/popup-blocked'))

    expect(message).toBe(AUTH_ERROR_MESSAGES.popupBlocked)
    expect(message).toContain('açılır pencerelere izin ver')
  })

  it('gives a network message for network failures', () => {
    expect(authErrorMessage(firebaseError('auth/network-request-failed'))).toBe(
      AUTH_ERROR_MESSAGES.network,
    )
  })

  it.each([
    ['an unknown code', firebaseError('auth/internal-error')],
    ['an error without a code', new Error('boom')],
    ['a non-error value', 'boom'],
  ])('gives a generic message for %s', (_label, error) => {
    expect(authErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES.generic)
  })
})
