// @vitest-environment node
// Scripts do not import app code, so the mechanic packs and the name normalization exist twice: here in
// `cardCatalog.ts`, and in `src/features/cards/`. This test fails when the two copies disagree. The sets are stored
// data, read by both from Firestore.
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { MECHANIC_PACKS as APP_MECHANIC_PACKS } from '../../src/features/cards/mechanicPacks.ts'
import { normalize as appNormalize } from '../../src/features/cards/text.ts'
import { MECHANIC_PACKS, normalize } from './cardCatalog.ts'
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
