import { FirestoreError } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { InvalidDataError, toSubscriptionError } from './errors'

/** FirestoreError has a public runtime constructor, but its type declares it private. */
const FirestoreErrorClass = FirestoreError as unknown as new (
  code: FirestoreError['code'],
  message: string,
) => FirestoreError

describe('toSubscriptionError', () => {
  it('maps invalid data to invalid-data with the document path and issues', () => {
    const issues = z.object({ name: z.string() }).safeParse({}).error?.issues ?? []
    const error = toSubscriptionError(new InvalidDataError('cards/c1', issues), 'cards')

    expect(error.kind).toBe('invalid-data')
    expect(error.path).toBe('cards/c1')
    expect(error.issues).toHaveLength(1)
    expect(error.message).toContain('cards/c1')
    expect(error.message).toContain('name')
  })

  it('maps a Firestore permission error to permission-denied', () => {
    const error = toSubscriptionError(
      new FirestoreErrorClass('permission-denied', 'Missing or insufficient permissions.'),
      'secrets/s1',
    )

    expect(error).toEqual({
      kind: 'permission-denied',
      message: 'Missing or insufficient permissions.',
      path: 'secrets/s1',
    })
  })

  it('keeps the code of other Firestore errors', () => {
    const error = toSubscriptionError(new FirestoreErrorClass('unavailable', 'Offline.'), 'cards')

    expect(error).toEqual({
      kind: 'unknown',
      message: 'Offline.',
      path: 'cards',
      code: 'unavailable',
    })
  })

  it('maps any other error or value to unknown', () => {
    expect(toSubscriptionError(new Error('boom'), 'cards')).toEqual({
      kind: 'unknown',
      message: 'boom',
      path: 'cards',
    })
    expect(toSubscriptionError('weird', 'cards')).toEqual({
      kind: 'unknown',
      message: 'weird',
      path: 'cards',
    })
  })
})
