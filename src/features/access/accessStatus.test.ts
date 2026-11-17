import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import type { Subscription } from '@/lib/firestore/subscription'

import { accessStatusOf, needsLink } from './accessStatus'
import type { AccessEntry } from './schema'

const entry = (uid?: string): AccessEntry => ({
  email: 'ayla@example.com',
  addedAt: Timestamp.fromMillis(0),
  ...(uid ? { uid } : {}),
})

const ready = (
  data: AccessEntry | null,
  { fromCache = false, hasPendingWrites = false } = {},
): Subscription<AccessEntry | null> => ({ status: 'ready', data, fromCache, hasPendingWrites })

describe('accessStatusOf', () => {
  it('is checking until the subscription answers', () => {
    expect(accessStatusOf({ status: 'loading' })).toBe('checking')
  })

  it('lets in an entry from the server or from the cache', () => {
    expect(accessStatusOf(ready(entry('ayla')))).toBe('member')
    expect(accessStatusOf(ready(entry(), { fromCache: true }))).toBe('member')
  })

  it('waits for the server when only the cache says there is no entry', () => {
    expect(accessStatusOf(ready(null, { fromCache: true }))).toBe('checking')
  })

  it('has no access when the server says there is no entry', () => {
    expect(accessStatusOf(ready(null))).toBe('noAccess')
  })

  it('is still checking when the read fails, which is never an answer (retry-own-access-check)', () => {
    expect(
      accessStatusOf({
        status: 'error',
        error: { kind: 'permission-denied', message: 'denied', path: 'allowedEmails/x' },
      }),
    ).toBe('checking')
  })
})

describe('needsLink', () => {
  it('is true only for an unlinked entry as the server has it', () => {
    expect(needsLink(ready(entry()))).toBe(true)
    expect(needsLink(ready(entry('ayla')))).toBe(false)
    expect(needsLink(ready(null))).toBe(false)
    expect(needsLink(ready(entry(), { fromCache: true }))).toBe(false)
    expect(needsLink(ready(entry(), { hasPendingWrites: true }))).toBe(false)
    expect(needsLink({ status: 'loading' })).toBe(false)
  })
})
