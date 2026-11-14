import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { ArtManifest } from '@/features/art/schema'
import { CURSED_BACK, NEUTRAL_BACK, type SpreadBack } from '@/features/art/spreadBack'
import { testArt } from '@/test/artFixtures'
import { TestArtProvider } from '@/test/TestArtProvider'

import { DeckPile } from './DeckPile'

const BACKS = testArt({
  cardbacks: {
    Kesqer: '/art/backs/kesqer.0123456789.webp',
    cursed: '/art/backs/cursed.0123456789.webp',
  },
})

function setup(back: SpreadBack, art: ArtManifest = BACKS) {
  render(
    <TestArtProvider manifest={art}>
      <DeckPile back={back} count={24} />
    </TestArtProvider>,
  )
  return screen.getByTestId('deck-pile')
}

describe('DeckPile', () => {
  it("shows a set's cardback on every layer of the deck", () => {
    const pile = setup({ kind: 'set', setCode: 'Kesqer' })
    const pictures = pile.querySelectorAll('img')
    expect(pictures).toHaveLength(3)
    for (const picture of pictures)
      expect(picture).toHaveAttribute('src', '/art/backs/kesqer.0123456789.webp')
  })

  it('shows the Cursed cardback for the Cursed Deck', () => {
    expect(setup(CURSED_BACK).querySelector('img')).toHaveAttribute(
      'src',
      '/art/backs/cursed.0123456789.webp',
    )
  })

  it('shows the neutral back without a picture', () => {
    const pile = setup(NEUTRAL_BACK)
    expect(pile.querySelector('img')).toBeNull()
    expect(pile).toHaveAttribute('data-back', 'css-neutral')
    expect(pile).toHaveTextContent('✦')
  })

  it('falls back to the neutral back for a set without a cardback', () => {
    const pile = setup({ kind: 'set', setCode: 'Havenholm' })
    expect(pile.querySelector('img')).toBeNull()
    expect(pile).toHaveAttribute('data-back', 'css-neutral')
  })

  it('shows how many cards a draw picks from', () => {
    const pile = setup(NEUTRAL_BACK)
    expect(pile).toHaveTextContent('24')
    expect(screen.getByText('24 uygun kart')).toBeInTheDocument()
  })
})
