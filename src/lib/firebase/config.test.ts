import { describe, expect, it } from 'vitest'

import { parseFirebaseSettings } from './config'

const validEnv = {
  VITE_FIREBASE_API_KEY: 'demo-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo-legend-cards.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo-legend-cards',
  VITE_FIREBASE_APP_ID: 'demo-app-id',
  VITE_FIREBASE_STORAGE_BUCKET: 'demo-legend-cards.firebasestorage.app',
  VITE_USE_FIREBASE_EMULATORS: 'true',
}

describe('parseFirebaseSettings', () => {
  it('parses valid values', () => {
    expect(parseFirebaseSettings(validEnv)).toEqual({
      ok: true,
      settings: {
        apiKey: 'demo-api-key',
        authDomain: 'demo-legend-cards.firebaseapp.com',
        projectId: 'demo-legend-cards',
        appId: 'demo-app-id',
        storageBucket: 'demo-legend-cards.firebasestorage.app',
        useEmulators: true,
      },
    })
  })

  it('names a missing project ID', () => {
    const { VITE_FIREBASE_PROJECT_ID: _omitted, ...env } = validEnv

    expect(parseFirebaseSettings(env)).toEqual({
      ok: false,
      problems: [{ key: 'VITE_FIREBASE_PROJECT_ID', kind: 'missing' }],
    })
  })

  it('names a missing storage bucket', () => {
    const { VITE_FIREBASE_STORAGE_BUCKET: _omitted, ...env } = validEnv

    expect(parseFirebaseSettings(env)).toEqual({
      ok: false,
      problems: [{ key: 'VITE_FIREBASE_STORAGE_BUCKET', kind: 'missing' }],
    })
  })

  it('treats an empty value as missing', () => {
    const result = parseFirebaseSettings({ ...validEnv, VITE_FIREBASE_PROJECT_ID: '  ' })

    expect(result).toEqual({
      ok: false,
      problems: [{ key: 'VITE_FIREBASE_PROJECT_ID', kind: 'missing' }],
    })
  })

  it('reports every problem, in a stable order', () => {
    const result = parseFirebaseSettings({ VITE_USE_FIREBASE_EMULATORS: 'yes' })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.problems).toEqual([
      { key: 'VITE_FIREBASE_API_KEY', kind: 'missing' },
      { key: 'VITE_FIREBASE_AUTH_DOMAIN', kind: 'missing' },
      { key: 'VITE_FIREBASE_PROJECT_ID', kind: 'missing' },
      { key: 'VITE_FIREBASE_APP_ID', kind: 'missing' },
      { key: 'VITE_FIREBASE_STORAGE_BUCKET', kind: 'missing' },
      { key: 'VITE_USE_FIREBASE_EMULATORS', kind: 'invalid' },
    ])
  })

  it.each([
    ['true', true],
    ['false', false],
    [undefined, false],
  ])('turns the emulator flag %s into the boolean %s', (flag, expected) => {
    const result = parseFirebaseSettings({ ...validEnv, VITE_USE_FIREBASE_EMULATORS: flag })

    expect(result.ok && result.settings.useEmulators).toBe(expected)
  })
})
