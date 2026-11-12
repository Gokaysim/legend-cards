import { describe, expect, it } from 'vitest'

import { pictureAddress } from './pictureAddress'

const PATH = 'cards/legend-abolethseyes/93e6f39a91.webp'

describe('pictureAddress', () => {
  it('builds the Cloud Storage download address, with the path encoded', () => {
    expect(
      pictureAddress({ bucket: 'legend-cards.firebasestorage.app', emulatorOrigin: null }, PATH),
    ).toBe(
      'https://firebasestorage.googleapis.com/v0/b/legend-cards.firebasestorage.app/o/cards%2Flegend-abolethseyes%2F93e6f39a91.webp?alt=media',
    )
  })

  it("builds the Storage emulator's address", () => {
    expect(
      pictureAddress(
        {
          bucket: 'demo-legend-cards.firebasestorage.app',
          emulatorOrigin: 'http://127.0.0.1:9199',
        },
        'words/tw-abyss/abcdef0123.webp',
      ),
    ).toBe(
      'http://127.0.0.1:9199/v0/b/demo-legend-cards.firebasestorage.app/o/words%2Ftw-abyss%2Fabcdef0123.webp?alt=media',
    )
  })
})
