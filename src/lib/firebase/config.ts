import { z } from 'zod'

/** The Firebase settings the app needs, parsed from Vite's environment variables. */
export type FirebaseSettings = {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
  /** The Cloud Storage bucket of the card and word pictures, for example `<project-id>.firebasestorage.app`. */
  storageBucket: string
  useEmulators: boolean
}

export type ConfigProblem = {
  /** The environment variable name, for example `VITE_FIREBASE_PROJECT_ID`. */
  key: string
  kind: 'missing' | 'invalid'
}

export type ConfigResult =
  { ok: true; settings: FirebaseSettings } | { ok: false; problems: ConfigProblem[] }

const requiredText = z.string().trim().min(1)

const envSchema = z.object({
  VITE_FIREBASE_API_KEY: requiredText,
  VITE_FIREBASE_AUTH_DOMAIN: requiredText,
  VITE_FIREBASE_PROJECT_ID: requiredText,
  VITE_FIREBASE_APP_ID: requiredText,
  VITE_FIREBASE_STORAGE_BUCKET: requiredText,
  VITE_USE_FIREBASE_EMULATORS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
})

/** The environment variables the app reads, in the order they are reported. */
export const CONFIG_KEYS = Object.keys(envSchema.shape)

function isBlank(value: unknown): boolean {
  return value === undefined || (typeof value === 'string' && value.trim() === '')
}

/** Checks the environment variables. Never throws: problems are returned so the app can show them. */
export function parseFirebaseSettings(env: Record<string, unknown>): ConfigResult {
  const result = envSchema.safeParse(env)
  if (result.success) {
    const data = result.data
    return {
      ok: true,
      settings: {
        apiKey: data.VITE_FIREBASE_API_KEY,
        authDomain: data.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: data.VITE_FIREBASE_PROJECT_ID,
        appId: data.VITE_FIREBASE_APP_ID,
        storageBucket: data.VITE_FIREBASE_STORAGE_BUCKET,
        useEmulators: data.VITE_USE_FIREBASE_EMULATORS,
      },
    }
  }

  const keys = new Set(result.error.issues.map((issue) => String(issue.path[0])))
  const problems = CONFIG_KEYS.filter((key) => keys.has(key)).map((key): ConfigProblem => ({
    key,
    kind: isBlank(env[key]) ? 'missing' : 'invalid',
  }))
  return { ok: false, problems }
}
