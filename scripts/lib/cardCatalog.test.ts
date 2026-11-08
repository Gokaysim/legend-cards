// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  isKnownMechanicPack,
  isKnownSetCode,
  MECHANIC_PACKS,
  normalize,
  OFFICIAL_SETS,
} from './cardCatalog.ts'

describe('normalize', () => {
  it.each([
    ["Brünn's Batallion", 'brunnsbatallion'],
    ["Al-Hızran's Hazard", 'alhizranshazard'],
    ["Åge's Acumen", 'agesacumen'],
    ["Aboleth's Eyes", 'abolethseyes'],
    ['Aboleths Eyes', 'abolethseyes'],
    ['Straße', 'strasse'],
    ['Þór Ølsen', 'thorolsen'],
    ['İstanbul', 'istanbul'],
    ['  Spaces   Everywhere ', 'spaceseverywhere'],
    ['5-Cost Custom Card', '5costcustomcard'],
  ])('turns %j into %j', (input, expected) => {
    expect(normalize(input)).toBe(expected)
  })

  it('leaves nothing of a name without letters or digits', () => {
    expect(normalize('— ?!')).toBe('')
  })
})

describe('official sets', () => {
  it('lists twelve sets in shop order, with Pandemonium last', () => {
    expect(OFFICIAL_SETS.map((set) => set.code)).toEqual([
      'The End is Nigh',
      'Pentagon',
      'Rhodelen',
      'Ashavir',
      'Kesqer',
      'Godtower',
      'Davarron',
      'Havenholm',
      'Ulagal',
      'Nordhallr',
      'Gurgitea',
      'Pandemonium',
    ])
  })

  it.each(['The End Is Nigh', 'endisnigh', 'Ragnarök', 'ragnarok', 'KESQER', 'Pandemonium'])(
    'knows %j',
    (code) => {
      expect(isKnownSetCode(code)).toBe(true)
    },
  )

  it.each(['Kesqeria', 'Blessed', 'Cursed', ''])('does not know %j', (code) => {
    expect(isKnownSetCode(code)).toBe(false)
  })
})

describe('mechanic packs', () => {
  it('has the eight packs', () => {
    expect(MECHANIC_PACKS).toHaveLength(8)
  })

  it.each(["Dungeoneer's Kit", 'dungeoneers kit', 'Blood & Battle', 'RISK & REWARD'])(
    'knows %j',
    (name) => {
      expect(isKnownMechanicPack(name)).toBe(true)
    },
  )

  it.each(['Blood and Battle', 'Custom Draft'])('does not know %j', (name) => {
    expect(isKnownMechanicPack(name)).toBe(false)
  })
})
