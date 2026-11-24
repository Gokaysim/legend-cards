import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { parseCustomEffectFile } from '../scripts/lib/customEffectRows.ts'
import { CUSTOM_EFFECTS_PATH, runEffectImport } from '../scripts/lib/importCustomEffects.ts'
import {
  type AdminHandle,
  defaultBucket,
  DEMO_PROJECT_ID,
  openAdmin,
} from '../scripts/lib/target.ts'
import { DATA_FILES, fixtureFile } from '../scripts/lib/testData.ts'

// The custom effects import (spec: custom-cards, "Importing the custom effects"; design D7 of add-custom-card-draft).
// `firebase emulators:exec` sets FIRESTORE_EMULATOR_HOST for this run.
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

beforeEach(async () => {
  await admin.db.recursiveDelete(admin.db.collection('customEffects'))
})

const fixture = () => {
  const parsed = parseCustomEffectFile(fixtureFile(DATA_FILES.customEffects))
  expect(parsed.errors).toEqual([])
  return parsed.variants
}

const storedVariants = async () =>
  (await admin.db.doc(CUSTOM_EFFECTS_PATH).get()).data()?.variants as
    Record<string, Record<string, string>> | undefined

describe('custom effects import against the emulators', () => {
  it('stores every variant of the test file on a first import', async () => {
    const { plan, written } = await runEffectImport(admin.db, fixture(), { dryRun: false })
    expect(written).toBe(53)
    expect(plan.counts).toEqual({ added: 53, changed: 0, unchanged: 0 })
    const variants = await storedVariants()
    expect(Object.keys(variants ?? {})).toHaveLength(18)
    expect(variants?.Draw).toEqual({
      '1': 'Invented Draw effect, small.',
      '3': 'Invented Draw effect, medium.',
    })
    const snapshot = await admin.db.doc(CUSTOM_EFFECTS_PATH).get()
    expect(snapshot.data()?.importedAt).toBeDefined()
  })

  it('merges a re-import: new texts replace, missing ones stay', async () => {
    await runEffectImport(admin.db, fixture(), { dryRun: false })
    const next = parseCustomEffectFile(
      'name,1-cost version,3-cost version,5-cost version\nDraw,,New draw.,Big draw.\nEffects,More effects.,,',
    )
    const { plan } = await runEffectImport(admin.db, next.variants, { dryRun: false })
    expect(plan.counts).toEqual({ added: 1, changed: 2, unchanged: 0 })
    expect(plan.costTypesChanged).toEqual(['Effects'])
    const variants = await storedVariants()
    expect(variants?.Draw).toEqual({
      '1': 'Invented Draw effect, small.',
      '3': 'New draw.',
      '5': 'Big draw.',
    })
    expect(variants?.Effects?.['1']).toBe('More effects.')
    expect(variants?.Effects?.['3']).toBe('Invented Effects effect, medium.')
  })

  it('writes nothing on a dry run', async () => {
    const { plan, written } = await runEffectImport(admin.db, fixture(), { dryRun: true })
    expect(written).toBe(0)
    expect(plan.counts.added).toBe(53)
    expect((await admin.db.doc(CUSTOM_EFFECTS_PATH).get()).exists).toBe(false)
  })

  it('stops before writing when a column is missing', () => {
    const parsed = parseCustomEffectFile('name,1-cost version,5-cost version\nDraw,a,b')
    expect(parsed.errors[0]).toEqual({ kind: 'missing-columns', columns: ['3-cost version'] })
    expect(parsed.variants).toEqual([])
  })
})
