import { randomUUID } from 'node:crypto'
import { createInterface } from 'node:readline/promises'
import type { Readable, Writable } from 'node:stream'

import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app'
import { type Auth, getAuth } from 'firebase-admin/auth'
import { type Firestore, getFirestore } from 'firebase-admin/firestore'
import { getStorage, type Storage } from 'firebase-admin/storage'

import { messages } from './messages.ts'

/** The demo project the emulators run. Firebase treats `demo-` projects as offline-only. */
export const DEMO_PROJECT_ID = 'demo-legend-cards'

/** Where the local emulators listen. Must match firebase.json. */
export const EMULATOR_DEFAULTS = {
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
} as const

/**
 * A project's Cloud Storage bucket of the pictures, unless `--bucket` names another: the default bucket of a project
 * created today. Development uses `demo-legend-cards.firebasestorage.app`, as `.env.development` does.
 */
export const defaultBucket = (projectId: string) => `${projectId}.firebasestorage.app`

const EMULATOR_VARIABLES = Object.keys(EMULATOR_DEFAULTS) as (keyof typeof EMULATOR_DEFAULTS)[]

/** The options every admin script accepts, to merge into its own `parseArgs` options. */
export const TARGET_OPTIONS = {
  project: { type: 'string' },
  yes: { type: 'boolean', default: false },
  bucket: { type: 'string' },
} as const

export type TargetValues = {
  project?: string | undefined
  yes?: boolean | undefined
  bucket?: string | undefined
}

/** Where a script acts: the emulators or a real project, and the bucket of its pictures. */
export type Target =
  | { kind: 'emulator'; projectId: typeof DEMO_PROJECT_ID; bucket: string }
  | { kind: 'project'; projectId: string; skipConfirmation: boolean; bucket: string }

export type TargetFailure =
  | { reason: 'demo-project'; message: string }
  | { reason: 'mixed-environment'; message: string }
  | { reason: 'emulators-unreachable'; message: string }
  | { reason: 'not-confirmed'; message: string }

type Env = Record<string, string | undefined>

/**
 * Picks the target from the options: the local emulators by default, a real project only when `--project`
 * names one. Refuses a `demo-` project with `--project`, and refuses `--project` while emulator variables are
 * set, so a run never mixes targets.
 */
export function chooseTarget(
  values: TargetValues,
  env: Env,
): { ok: true; target: Target } | ({ ok: false } & TargetFailure) {
  const projectId = values.project?.trim()
  const bucketOf = (id: string) => values.bucket?.trim() || defaultBucket(id)
  if (!projectId) {
    return {
      ok: true,
      target: { kind: 'emulator', projectId: DEMO_PROJECT_ID, bucket: bucketOf(DEMO_PROJECT_ID) },
    }
  }
  if (projectId.startsWith('demo-')) {
    return { ok: false, reason: 'demo-project', message: messages.demoProject(projectId) }
  }
  const setVariables = EMULATOR_VARIABLES.filter((name) => env[name])
  if (setVariables.length > 0) {
    return {
      ok: false,
      reason: 'mixed-environment',
      message: messages.mixedEnvironment(setVariables.join(', ')),
    }
  }
  return {
    ok: true,
    target: {
      kind: 'project',
      projectId,
      skipConfirmation: values.yes === true,
      bucket: bucketOf(projectId),
    },
  }
}

/** True when every emulator answers HTTP at all. Any response counts; only a network error does not. */
export async function emulatorsReachable(env: Env, fetchFn: typeof fetch): Promise<boolean> {
  const hosts = EMULATOR_VARIABLES.map((name) => env[name] ?? EMULATOR_DEFAULTS[name])
  const results = await Promise.all(
    hosts.map((host) =>
      fetchFn(`http://${host}/`, { signal: AbortSignal.timeout(2000) }).then(
        () => true,
        () => false,
      ),
    ),
  )
  return results.every(Boolean)
}

/** Asks the user to type the project ID. Anything else, or the end of input, means no. */
export async function confirmProject(
  projectId: string,
  input: Readable,
  output: Writable,
): Promise<boolean> {
  const prompt = createInterface({ input, output, terminal: false })
  // If the input ends without an answer (Ctrl+D, or an empty pipe), `question` never settles: treat it as no.
  const inputClosed = new Promise<null>((resolve) => prompt.once('close', () => resolve(null)))
  try {
    const answer = await Promise.race([
      prompt.question(messages.confirmPrompt(projectId)),
      inputClosed,
    ])
    return answer !== null && answer.trim() === projectId
  } catch {
    return false
  } finally {
    prompt.close()
  }
}

/** Admin SDK access to one target. Call `close` when the script is done. */
export type AdminHandle = {
  target: Target
  auth: Auth
  db: Firestore
  /** Cloud Storage; its default bucket is the target's `bucket`. */
  storage: Storage
  close: () => Promise<void>
}

/** Starts a separate Admin SDK app for the target. Emulator variables must already be set for the emulators. */
export function openAdmin(target: Target): AdminHandle {
  const app = initializeApp(
    target.kind === 'project'
      ? {
          projectId: target.projectId,
          storageBucket: target.bucket,
          credential: applicationDefault(),
        }
      : { projectId: target.projectId, storageBucket: target.bucket },
    `legend-cards-script-${randomUUID()}`,
  )
  return {
    target,
    auth: getAuth(app),
    db: getFirestore(app),
    // Only the picture import uses Cloud Storage: the other scripts never start its client.
    get storage() {
      return getStorage(app)
    },
    close: () => deleteApp(app),
  }
}

export type ConnectDeps = {
  env: Env
  fetch: typeof fetch
  input: Readable
  output: Writable
  open: (target: Target) => AdminHandle
}

const defaultDeps = (): ConnectDeps => ({
  env: process.env,
  fetch,
  input: process.stdin,
  output: process.stdout,
  open: openAdmin,
})

/**
 * Resolves the target and opens Admin SDK access to it, or explains why not. Nothing is opened, and so
 * nothing can change, unless every check passes: emulators reachable, or the real project confirmed.
 */
export async function connect(
  values: TargetValues,
  deps: Partial<ConnectDeps> = {},
): Promise<{ ok: true; admin: AdminHandle } | ({ ok: false } & TargetFailure)> {
  const { env, fetch: fetchFn, input, output, open } = { ...defaultDeps(), ...deps }
  const choice = chooseTarget(values, env)
  if (!choice.ok) return choice
  const { target } = choice

  if (target.kind === 'emulator') {
    for (const name of EMULATOR_VARIABLES) env[name] ??= EMULATOR_DEFAULTS[name]
    // The emulators need no Google Cloud credentials: skip the metadata-server lookup and its warning.
    env.METADATA_SERVER_DETECTION ??= 'none'
    if (!(await emulatorsReachable(env, fetchFn))) {
      return { ok: false, reason: 'emulators-unreachable', message: messages.emulatorsUnreachable }
    }
    output.write(`${messages.targetEmulator}\n`)
    return { ok: true, admin: open(target) }
  }

  output.write(`${messages.targetProject(target.projectId)}\n`)
  if (!target.skipConfirmation && !(await confirmProject(target.projectId, input, output))) {
    return { ok: false, reason: 'not-confirmed', message: messages.notConfirmed }
  }
  return { ok: true, admin: open(target) }
}
