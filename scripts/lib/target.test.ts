// @vitest-environment node
import { PassThrough, Readable } from 'node:stream'

import { describe, expect, it, vi } from 'vitest'

import {
  type AdminHandle,
  chooseTarget,
  connect,
  type ConnectDeps,
  DEMO_PROJECT_ID,
  type Target,
} from './target.ts'

/** Test dependencies: an empty environment, emulators that answer, no input, and a fake Admin SDK. */
function deps(overrides: Partial<ConnectDeps> = {}) {
  const output = new PassThrough()
  let printed = ''
  output.on('data', (chunk: Buffer) => (printed += chunk.toString()))
  const open = vi.fn((target: Target) => ({ target }) as unknown as AdminHandle)
  return {
    deps: {
      env: {} as Record<string, string | undefined>,
      fetch: vi.fn(() => Promise.resolve(new Response('Ok'))) as unknown as typeof fetch,
      input: Readable.from([]),
      output,
      open,
      ...overrides,
    },
    open,
    printed: () => printed,
  }
}

describe('chooseTarget', () => {
  it('targets the emulators of the demo project by default', () => {
    expect(chooseTarget({}, {})).toEqual({
      ok: true,
      target: { kind: 'emulator', projectId: DEMO_PROJECT_ID },
    })
  })

  it('targets a real project only when --project names one', () => {
    expect(chooseTarget({ project: 'legend-prod' }, {})).toEqual({
      ok: true,
      target: { kind: 'project', projectId: 'legend-prod', skipConfirmation: false },
    })
    expect(chooseTarget({ project: 'legend-prod', yes: true }, {})).toMatchObject({
      target: { skipConfirmation: true },
    })
  })

  it('refuses a demo project with --project', () => {
    expect(chooseTarget({ project: 'demo-legend-cards' }, {})).toMatchObject({
      ok: false,
      reason: 'demo-project',
    })
  })

  it('refuses --project while an emulator variable is set', () => {
    expect(
      chooseTarget({ project: 'legend-prod' }, { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }),
    ).toMatchObject({ ok: false, reason: 'mixed-environment' })
  })
})

describe('connect', () => {
  it('opens the emulators when they answer, setting the emulator variables first', async () => {
    const { deps: d, open } = deps()

    const result = await connect({}, d)

    expect(result.ok).toBe(true)
    expect(open).toHaveBeenCalledWith({ kind: 'emulator', projectId: DEMO_PROJECT_ID })
    expect(d.env).toEqual({
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      METADATA_SERVER_DETECTION: 'none',
    })
  })

  it('keeps emulator addresses that are already set, for example by emulators:exec', async () => {
    const { deps: d } = deps({ env: { FIRESTORE_EMULATOR_HOST: '127.0.0.1:9999' } })

    await connect({}, d)

    expect(d.fetch).toHaveBeenCalledWith('http://127.0.0.1:9999/', expect.anything())
  })

  it('stops without opening anything when the emulators do not answer', async () => {
    const { deps: d, open } = deps({
      fetch: vi.fn(() => Promise.reject(new Error('ECONNREFUSED'))) as unknown as typeof fetch,
    })

    const result = await connect({}, d)

    expect(result).toMatchObject({ ok: false, reason: 'emulators-unreachable' })
    if (!result.ok) expect(result.message).toContain('Emulatorler çalışmıyor')
    expect(open).not.toHaveBeenCalled()
  })

  it('opens a real project after the project ID is typed', async () => {
    const { deps: d, open, printed } = deps({ input: Readable.from(['legend-prod\n']) })

    const result = await connect({ project: 'legend-prod' }, d)

    expect(result.ok).toBe(true)
    expect(open).toHaveBeenCalledWith({
      kind: 'project',
      projectId: 'legend-prod',
      skipConfirmation: false,
    })
    expect(printed()).toContain('legend-prod')
  })

  it('does not open a real project when the confirmation is wrong or missing', async () => {
    for (const input of [Readable.from(['nope\n']), Readable.from([])]) {
      const { deps: d, open } = deps({ input })

      const result = await connect({ project: 'legend-prod' }, d)

      expect(result).toMatchObject({ ok: false, reason: 'not-confirmed' })
      expect(open).not.toHaveBeenCalled()
    }
  })

  it('skips the question with --yes', async () => {
    const { deps: d, open } = deps()

    const result = await connect({ project: 'legend-prod', yes: true }, d)

    expect(result.ok).toBe(true)
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('never checks or opens anything for a refused target', async () => {
    const { deps: d, open } = deps()

    const result = await connect({ project: 'demo-legend-cards' }, d)

    expect(result).toMatchObject({ ok: false, reason: 'demo-project' })
    expect(d.fetch).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
  })
})
