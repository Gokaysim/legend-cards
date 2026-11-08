import { describe, expect, it } from 'vitest'

import { OFFICIAL_SETS, officialSet, setDisplayName, setOrder } from './sets'

describe('setDisplayName', () => {
  it.each([
    ['Kesqer', 'Kesqerian Nights'],
    ['The End Is Nigh', 'The End is Nigh'],
    ['endisnigh', 'The End is Nigh'],
    ['Nordhallr', 'Ragnarök: Nordhallr'],
    ['ragnarok', 'Ragnarök: Nordhallr'],
    ['Ulagal', 'Ballad of Ulagal'],
    ['Pandemonium', 'Pandemonium'],
  ])('shows %j as %j', (code, name) => {
    expect(setDisplayName(code)).toBe(name)
  })

  it('keeps a code that is not in the list as written, and never invents a name', () => {
    expect(setDisplayName('Kesqeria')).toBe('Kesqeria')
    expect(officialSet('Kesqeria')).toBeUndefined()
  })
})

describe('setOrder', () => {
  it('follows the shop order of docs/domain.md, with Pandemonium last', () => {
    const codes = [
      'Pandemonium',
      'Gurgitea',
      'Kesqer',
      'The End Is Nigh',
      'Ulagal',
      'Pentagon',
      'Nordhallr',
      'Havenholm',
      'Rhodelen',
      'Davarron',
      'Ashavir',
      'Godtower',
    ]
    expect([...codes].sort((a, b) => setOrder(a) - setOrder(b))).toEqual([
      'The End Is Nigh',
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

  it('puts an unknown code after every known set', () => {
    expect(setOrder('Kesqeria')).toBe(OFFICIAL_SETS.length)
    expect(setOrder('Kesqeria')).toBeGreaterThan(setOrder('Pandemonium'))
  })
})
