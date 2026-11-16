import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'

import { Timestamp } from 'firebase-admin/firestore'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { allowEmail } from '../scripts/lib/allowEmail.ts'
import { messages } from '../scripts/lib/messages.ts'
import {
  type AdminHandle,
  defaultBucket,
  DEMO_PROJECT_ID,
  openAdmin,
} from '../scripts/lib/target.ts'

// `firebase emulators:exec` sets FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST for this run.
let admin: AdminHandle

const run = promisify(execFile)
const SCRIPT = new URL('../scripts/allow-email.ts', import.meta.url).pathname

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

/** The exit code and error output of a command run that must fail. */
async function failureOf(args: string[]): Promise<{ code: unknown; stderr: string }> {
  try {
    await run('node', [SCRIPT, ...args])
  } catch (error) {
    const { code, stderr } = error as { code?: unknown; stderr?: unknown }
    return { code, stderr: typeof stderr === 'string' ? stderr : '' }
  }
  throw new Error('Expected the command to fail')
}

/** A unique address, so the tests never meet each other's entries. */
const uniqueEmail = (name: string) => `${name}-${randomUUID()}@example.com`

async function storedEntry(email: string) {
  return (await admin.db.doc(`allowedEmails/${email}`).get()).data()
}

describe('allowEmail against the emulators', () => {
  it('adds an address in lowercase with the server time, before any account has it', async () => {
    const email = uniqueEmail('dm')
    await expect(allowEmail(admin, `  ${email.toUpperCase()} `)).resolves.toEqual({
      kind: 'added',
      email,
    })
    const entry = await storedEntry(email)
    expect(Object.keys(entry ?? {})).toEqual(['addedAt'])
    expect(entry?.addedAt).toBeInstanceOf(Timestamp)
  })

  it('changes nothing for an address already on the list, keeping its link and its adding time', async () => {
    const email = uniqueEmail('ayla')
    const stored = { addedAt: Timestamp.fromMillis(0), uid: 'ayla' }
    await admin.db.doc(`allowedEmails/${email}`).set(stored)

    await expect(allowEmail(admin, email)).resolves.toEqual({ kind: 'unchanged', email })
    expect(await storedEntry(email)).toEqual(stored)
  })

  it('refuses a malformed address and writes nothing', async () => {
    await expect(allowEmail(admin, 'cem.example.com')).resolves.toEqual({
      kind: 'invalid',
      email: 'cem.example.com',
    })
    expect(await storedEntry('cem.example.com')).toBeUndefined()
  })
})

describe('the allow-email command', () => {
  it('adds an address and reports it', async () => {
    const email = uniqueEmail('oyuncu')
    const { stdout } = await run('node', [SCRIPT, '--email', email])
    expect(stdout).toContain(messages.emailAllowed(email))
    expect(await storedEntry(email)).toBeDefined()
  })

  it('prints its usage without an address, and a message for a malformed one', async () => {
    const missing = await failureOf([])
    expect(missing.code).toBe(1)
    expect(missing.stderr).toContain(messages.usageAllowEmail)

    const malformed = await failureOf(['--email', 'cem.example.com'])
    expect(malformed.code).toBe(1)
    expect(malformed.stderr).toContain(messages.invalidEmail('cem.example.com'))
  })
})
