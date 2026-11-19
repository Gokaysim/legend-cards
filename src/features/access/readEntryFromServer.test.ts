import { beforeEach, describe, expect, it, vi } from 'vitest'

import { readEntryFromServer } from './api'

// Design D2 of diagnose-no-access: the direct read reports what it found and never throws. Design D4 of
// drop-persistent-cache-and-dm-own-entry-query: it goes through Firestore Lite, past the main instance's cache and
// listeners.

const lite = vi.hoisted(() => ({ existsOnServer: vi.fn() }))

vi.mock('@/lib/firebase/firestore', () => ({ db: { name: 'test-db' } }))
vi.mock('@/lib/firebase/firestoreLite', () => ({ existsOnServer: lite.existsOnServer }))

describe('readEntryFromServer', () => {
  beforeEach(() => {
    lite.existsOnServer.mockReset()
  })

  it('reports an entry the server has, and one it does not have', async () => {
    lite.existsOnServer.mockResolvedValueOnce(true)
    lite.existsOnServer.mockResolvedValueOnce(false)

    expect(await readEntryFromServer('cem@gmail.com')).toBe('exists')
    expect(await readEntryFromServer('cem@gmail.com')).toBe('missing')
    expect(lite.existsOnServer).toHaveBeenCalledWith('allowedEmails', 'cem@gmail.com')
  })

  it('reports a failed read by its code instead of throwing', async () => {
    lite.existsOnServer.mockRejectedValueOnce(
      Object.assign(new Error('denied'), { code: 'permission-denied' }),
    )
    lite.existsOnServer.mockRejectedValueOnce(new Error('odd'))

    expect(await readEntryFromServer('cem@gmail.com')).toBe('error:permission-denied')
    expect(await readEntryFromServer('cem@gmail.com')).toBe('error:unknown')
  })
})
