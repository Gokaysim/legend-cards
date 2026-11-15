// @vitest-environment node
// Scripts do not import app code, so the mechanic packs, the name normalization and the starting flags exist twice: here
// in `cardCatalog.ts`, and in `src/features/`. This test fails when the two copies disagree. The sets are stored data,
// read by both from Firestore.
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { MECHANIC_PACKS as APP_MECHANIC_PACKS } from '../../src/features/cards/mechanicPacks.ts'
import { normalize as appNormalize } from '../../src/features/cards/text.ts'
import {
  DEFINITION_KINDS,
  startingFlags as appStartingFlags,
} from '../../src/features/definitions/flags.ts'
import { MECHANIC_PACKS, normalize, startingFlags } from './cardCatalog.ts'
import { parseCardFile } from './cardRows.ts'

const dataFile = (name: string) =>
  readFileSync(new URL(`../../data/${name}`, import.meta.url), 'utf8')

describe('the script catalog and the app agree', () => {
  it('on the eight mechanic packs', () => {
    expect(MECHANIC_PACKS).toEqual(APP_MECHANIC_PACKS)
  })

  it('on the normalization of every name in both card files', () => {
    const names = [
      ...parseCardFile(dataFile('legend-cards.csv'), 'legend').cards,
      ...parseCardFile(dataFile('cursed-cards.csv'), 'cursed').cards,
    ].map(({ card }) => card.name)
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

  it('on every text of the card and True Word files', () => {
    const cards = [
      ...parseCardFile(dataFile('legend-cards.csv'), 'legend').cards,
      ...parseCardFile(dataFile('cursed-cards.csv'), 'cursed').cards,
    ].map(({ card }) => card)
    for (const card of cards) {
      expect(startingFlags(card.kind, card.text), card.name).toEqual(
        appStartingFlags(card.kind, card.text),
      )
    }
  })
})
