import { describe, expect, it } from 'vitest'

import { isPicturePathOf, picturePath, picturePathSchema } from './picturePath'

describe('picturePath', () => {
  it('builds a card picture path', () => {
    expect(picturePath('card', 'legend-abolethseyes', '93e6f39a91')).toBe(
      'cards/legend-abolethseyes/93e6f39a91.webp',
    )
  })

  it('builds a word picture path', () => {
    expect(picturePath('word', 'tw-abyss', 'abcdef0123')).toBe('words/tw-abyss/abcdef0123.webp')
  })

  it.each(['93e6f39a9', '93E6F39A91', '93e6f39a91f', 'zzzzzzzzzz'])(
    'refuses the hash %s',
    (hash) => {
      expect(() => picturePath('card', 'legend-abolethseyes', hash)).toThrow()
    },
  )
})

describe('isPicturePathOf', () => {
  const path = 'cards/legend-abolethseyes/93e6f39a91.webp'

  it('accepts a path of the same card', () => {
    expect(isPicturePathOf('card', 'legend-abolethseyes', path)).toBe(true)
  })

  it.each([
    ['another card', 'card', 'legend-abolethseye'],
    ['a word with the same ID', 'word', 'legend-abolethseyes'],
  ] as const)('refuses %s', (_case, target, id) => {
    expect(isPicturePathOf(target, id, path)).toBe(false)
  })

  it.each([
    'cards/legend-abolethseyes/93E6F39A91.webp',
    'cards/legend-abolethseyes/93e6f39a9.webp',
    'cards/legend-abolethseyes/93e6f39a91.png',
    'cards/legend-abolethseyes/old/93e6f39a91.webp',
  ])('refuses %s', (other) => {
    expect(isPicturePathOf('card', 'legend-abolethseyes', other)).toBe(false)
  })
})

describe('picturePathSchema', () => {
  it.each(['cards/legend-abolethseyes/93e6f39a91.webp', 'words/tw-abyss/abcdef0123.webp'])(
    'accepts %s',
    (path) => {
      expect(picturePathSchema.safeParse(path).success).toBe(true)
    },
  )

  it.each([
    '/cards/legend-abolethseyes/93e6f39a91.webp',
    'cards/93e6f39a91.webp',
    'packs/x/93e6f39a91.webp',
  ])('rejects %s', (path) => {
    expect(picturePathSchema.safeParse(path).success).toBe(false)
  })
})
