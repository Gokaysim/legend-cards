import { randomUUID } from 'node:crypto'

import { Timestamp } from 'firebase-admin/firestore'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { setRoleByEmail } from '../scripts/lib/setRole.ts'
import {
  type AdminHandle,
  defaultBucket,
  DEMO_PROJECT_ID,
  openAdmin,
} from '../scripts/lib/target.ts'

// `firebase emulators:exec` sets FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST for this run.
let admin: AdminHandle

beforeAll(() => {
  admin = openAdmin({
    kind: 'emulator',
    projectId: DEMO_PROJECT_ID,
    bucket: defaultBucket(DEMO_PROJECT_ID),
  })
})

afterAll(async () => {
  await admin.close()
})

/** Creates an Auth account with a unique email address, and optionally its profile with a role. */
async function createUser(name: string, role?: 'player' | 'dm') {
  const email = `${name.toLowerCase()}-${randomUUID()}@example.com`
  const { uid } = await admin.auth.createUser({ email, displayName: name })
  if (role) {
    await admin.db.doc(`users/${uid}`).set({
      displayName: name,
      photoURL: null,
      role,
      createdAt: Timestamp.now(),
    })
  }
  return { email, uid }
}

async function storedRole(uid: string): Promise<unknown> {
  return (await admin.db.doc(`users/${uid}`).get()).get('role')
}

describe('setRoleByEmail against the emulators', () => {
  it('makes a player the DM, reporting the name and both roles', async () => {
    const { email, uid } = await createUser('Ayla', 'player')

    await expect(setRoleByEmail(admin, email, 'dm')).resolves.toEqual({
      kind: 'updated',
      uid,
      name: 'Ayla',
      from: 'player',
      to: 'dm',
    })
    expect(await storedRole(uid)).toBe('dm')
  })

  it('makes the DM a player again', async () => {
    const { email, uid } = await createUser('Dana', 'dm')

    await expect(setRoleByEmail(admin, email, 'player')).resolves.toMatchObject({
      kind: 'updated',
      from: 'dm',
      to: 'player',
    })
    expect(await storedRole(uid)).toBe('player')
  })

  it('changes nothing when the role is already set', async () => {
    const { email, uid } = await createUser('Cem', 'dm')

    await expect(setRoleByEmail(admin, email, 'dm')).resolves.toMatchObject({
      kind: 'unchanged',
      role: 'dm',
    })
    expect(await storedRole(uid)).toBe('dm')
  })

  it('stops for an unknown email address', async () => {
    const email = `nobody-${randomUUID()}@example.com`

    await expect(setRoleByEmail(admin, email, 'dm')).resolves.toEqual({
      kind: 'no-such-user',
      email,
    })
  })

  it('stops for an account that has no profile yet, without creating one', async () => {
    const { email, uid } = await createUser('Ece')

    await expect(setRoleByEmail(admin, email, 'dm')).resolves.toEqual({
      kind: 'no-profile',
      email,
      uid,
    })
    expect((await admin.db.doc(`users/${uid}`).get()).exists).toBe(false)
  })

  it('stops for an invalid role without touching the profile', async () => {
    const { email, uid } = await createUser('Fırat', 'player')

    await expect(setRoleByEmail(admin, email, 'admin')).resolves.toEqual({
      kind: 'invalid-role',
      role: 'admin',
    })
    expect(await storedRole(uid)).toBe('player')
  })
})
