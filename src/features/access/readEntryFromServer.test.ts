import type * as Firestore from 'firebase/firestore'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { readEntryFromServer } from './api'

// Design D2 of diagnose-no-access: the direct read reports what it found and never throws.

const getDocFromServer = vi.hoisted(() => vi.fn())

vi.mock('firebase/firestore', async (importOriginal) => ({
  ...(await importOriginal<typeof Firestore>()),
  collection: () => ({ withConverter: () => ({ path: 'allowedEmails' }) }),
  doc: (_parent: unknown, id: string) => ({ path: `allowedEmails/${id}` }),
  getDocFromServer,
}))

const db = {} as Parameters<typeof readEntryFromServer>[0]

describe('readEntryFromServer', () => {
  beforeEach(() => {
    getDocFromServer.mockReset()
  })

  it('reports an entry the server has, and one it does not have', async () => {
    getDocFromServer.mockResolvedValueOnce({ exists: () => true })
    getDocFromServer.mockResolvedValueOnce({ exists: () => false })

    expect(await readEntryFromServer(db, 'cem@gmail.com')).toBe('exists')
    expect(await readEntryFromServer(db, 'cem@gmail.com')).toBe('missing')
    expect(getDocFromServer).toHaveBeenCalledWith({ path: 'allowedEmails/cem@gmail.com' })
  })

  it('reports a failed read by its code instead of throwing', async () => {
    getDocFromServer.mockRejectedValueOnce(
      Object.assign(new Error('denied'), { code: 'permission-denied' }),
    )
    getDocFromServer.mockRejectedValueOnce(new Error('odd'))

    expect(await readEntryFromServer(db, 'cem@gmail.com')).toBe('error:permission-denied')
    expect(await readEntryFromServer(db, 'cem@gmail.com')).toBe('error:unknown')
  })
})
