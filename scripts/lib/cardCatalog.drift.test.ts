// @vitest-environment node
// Scripts do not import app code, so the mechanic packs, the name normalization and the starting flags exist twice: here
// in `cardCatalog.ts`, and in `src/features/`. This test fails when the two copies disagree. The sets are stored data,
// read by both from Firestore.
import { describe, expect, it } from 'vitest'

import { MECHANIC_PACKS as APP_MECHANIC_PACKS } from '../../src/features/cards/mechanicPacks.ts'
import { normalize as appNormalize } from '../../src/features/cards/text.ts'
import {
  DEFINITION_KINDS,
  startingFlags as appStartingFlags,
} from '../../src/features/definitions/flags.ts'
import { MECHANIC_PACKS, normalize, startingFlags } from './cardCatalog.ts'
import { parseCardFile } from './cardRows.ts'
import { DATA_FILES, fixtureFile, hasOwnerData, ownerFile } from './testData.ts'
import { parseTrueWordFile } from './trueWordRows.ts'

/** The cards and True Words of a set of files: the test files, or the owner's real ones. */
const definitionsIn = (read: (name: (typeof DATA_FILES)[keyof typeof DATA_FILES]) => string) => [
  ...parseCardFile(read(DATA_FILES.legend), 'legend').cards.map(({ card }) => card),
  ...parseCardFile(read(DATA_FILES.cursed), 'cursed').cards.map(({ card }) => card),
  ...parseTrueWordFile(read(DATA_FILES.trueWords)).words.map(({ word }) => ({
    ...word,
    kind: 'trueWord' as const,
  })),
]
const HAS_OWNER_DATA = hasOwnerData(DATA_FILES.legend, DATA_FILES.cursed, DATA_FILES.trueWords)

describe('the script catalog and the app agree', () => {
  it('on the eight mechanic packs', () => {
    expect(MECHANIC_PACKS).toEqual(APP_MECHANIC_PACKS)
  })

  it('on the normalization of every name in the test files', () => {
    const names = definitionsIn(fixtureFile).map(({ name }) => name)
    expect(names).toEqual(expect.arrayContaining(["Zoë's Bargain", 'Doppelgänger Infiltration']))
    for (const name of names) expect(appNormalize(name), name).toBe(normalize(name))
  })

  it.skipIf(!HAS_OWNER_DATA)("on the normalization of every name in the owner's files", () => {
    const names = definitionsIn(ownerFile).map(({ name }) => name)
    expect(names.length).toBeGreaterThan(700)
    for (const name of names) expect(appNormalize(name), name).toBe(normalize(name))
  })

  it('on the special letters and edge cases', () => {
    for (const value of ['Þór Ølsen', 'Straße', 'İstanbul', 'Œuvre ŋ ĸ ŧ ħ đ ð æ', '— ?!', '']) {
      expect(appNormalize(value), value).toBe(normalize(value))
    }
  })
})

describe('the starting flags of the script and the app agree', () => {
  const texts = [
    '',
    'Gain 1 LP.',
    'Held: +1 AC.',
    '  held : +1 AC.',
    '[Uno] Held: +1 AC.',
    'When held, gain 1 LP.',
  ]

  it.each(DEFINITION_KINDS)('for a %s definition', (kind) => {
    for (const text of texts)
      expect(startingFlags(kind, text), text).toEqual(appStartingFlags(kind, text))
  })

  it('on every text of the test files', () => {
    for (const definition of definitionsIn(fixtureFile)) {
      expect(startingFlags(definition.kind, definition.text), definition.name).toEqual(
        appStartingFlags(definition.kind, definition.text),
      )
    }
  })

  it.skipIf(!HAS_OWNER_DATA)("on every text of the owner's files", () => {
    for (const definition of definitionsIn(ownerFile)) {
      expect(startingFlags(definition.kind, definition.text), definition.name).toEqual(
        appStartingFlags(definition.kind, definition.text),
      )
    }
  })
})
