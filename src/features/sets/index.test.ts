import { describe, expect, it } from 'vitest'

import { artLookup } from '@/features/art/artContext'
import { testArt, testPictureUrl } from '@/test/artFixtures'
import { TEST_SETS, testSet } from '@/test/setFixtures'

import { EMPTY_SET_INDEX, orderSets, setIdOf, setIndex } from './index'
import { withSetPictures } from './setsContext'

const index = setIndex(TEST_SETS)

describe('setIdOf', () => {
  it('normalizes the code', () => {
    expect(setIdOf('The End is Nigh')).toBe('theendisnigh')
    expect(setIdOf('Ragnarök: Nordhallr')).toBe('ragnaroknordhallr')
    expect(setIdOf('—')).toBe('')
  })
})

describe('setIndex', () => {
  it.each([
    ['Kesqer', 'Kesqerian Nights'],
    ['The End Is Nigh', 'The End is Nigh'],
    ['endisnigh', 'The End is Nigh'],
    ['Ragnarök', 'Ragnarök: Nordhallr'],
    ['ragnarok', 'Ragnarök: Nordhallr'],
    ['Pandemonium', 'Pandemonium'],
  ])('finds %j as %j', (code, name) => {
    expect(index.setName(code)).toBe(name)
    expect(index.setOf(code)?.name).toBe(name)
  })

  it('keeps a code that no stored set has as written, and ranks it after every set', () => {
    expect(index.setName('Kesqeria')).toBe('Kesqeria')
    expect(index.setOf('Kesqeria')).toBeUndefined()
    expect(index.setRank('Kesqeria')).toBe(12)
  })

  it('ranks the sets by their stored position', () => {
    expect(index.sets.map((set) => set.code).slice(0, 3)).toEqual([
      'The End is Nigh',
      'Pentagon',
      'Rhodelen',
    ])
    expect(index.setRank('The End Is Nigh')).toBe(0)
    expect(index.setRank('Pandemonium')).toBe(11)
  })

  it('names nothing without stored sets', () => {
    expect(EMPTY_SET_INDEX.setName('Kesqer')).toBe('Kesqer')
    expect(EMPTY_SET_INDEX.setRank('Kesqer')).toBe(0)
  })
})

describe('orderSets', () => {
  it('sorts by position, and equal positions by ID', () => {
    const sets = [
      testSet('Ulagal', 'Ballad of Ulagal', 3),
      testSet('Kesqer', 'Kesqerian Nights', 3),
      testSet('Pentagon', 'Conclave at Pentagon', 1),
    ]
    expect(orderSets(sets).map((set) => set.id)).toEqual(['pentagon', 'kesqer', 'ulagal'])
  })
})

describe('withSetPictures', () => {
  const art = artLookup(
    testArt({
      cardbacks: { cursed: '/art/backs/cursed.0123456789.webp' },
      mascots: { cardmaker_shop: '/art/mascots/cardmaker_shop.0123456789.webp' },
    }),
    '/',
    testPictureUrl,
  )
  const withPictures = withSetPictures(
    art,
    setIndex(
      TEST_SETS.map((set) =>
        set.code === 'The End is Nigh'
          ? {
              ...set,
              cardback: 'sets/theendisnigh/0123456789.webp',
              mascot: 'sets/theendisnigh/abcdef0123.webp',
            }
          : set,
      ),
    ),
  )

  it("gives a set's stored cardback by any spelling of its code", () => {
    expect(withPictures.backUrl('The End Is Nigh')).toBe(
      testPictureUrl('sets/theendisnigh/0123456789.webp'),
    )
    expect(withPictures.backUrl('endisnigh')).toBe(
      testPictureUrl('sets/theendisnigh/0123456789.webp'),
    )
    expect(withPictures.backUrl('Kesqer')).toBeNull()
  })

  it('keeps the built cardbacks and Cardmakers for other keys', () => {
    expect(withPictures.backUrl('cursed')).toBe('/art/backs/cursed.0123456789.webp')
    expect(withPictures.mascotUrl('cardmaker_shop')).toBe(
      '/art/mascots/cardmaker_shop.0123456789.webp',
    )
  })

  it("gives a set's Cardmaker by its code or its set stem", () => {
    const url = testPictureUrl('sets/theendisnigh/abcdef0123.webp')
    expect(withPictures.setMascotUrl('The End Is Nigh')).toBe(url)
    expect(withPictures.mascotUrl('set:The End Is Nigh')).toBe(url)
    expect(withPictures.mascotUrl('set:Kesqer')).toBeNull()
    expect(withPictures.mascotUrl('set:Zaddir')).toBeNull()
  })
})
