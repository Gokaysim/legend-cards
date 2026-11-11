import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { testArt } from '@/test/artFixtures'
import { TestArtProvider } from '@/test/TestArtProvider'
import { testTrueWord } from '@/test/trueWordFixtures'

import { TrueWordTile } from './TrueWordTile'

const ABYSS = testTrueWord('Abyss', { cost: '5', text: 'A random card is free.' })
const ART = testArt({ words: { [ABYSS.id]: '/art/words/abyss.webp' } })

const withArt = (ui: ReactNode) => render(<TestArtProvider manifest={ART}>{ui}</TestArtProvider>)
const tile = () => screen.getByRole('article', { name: 'Abyss' })

describe('TrueWordTile as a picture alone', () => {
  it('shows only the picture and the active mark, and leaves the name, cost and text to screen readers', () => {
    withArt(<TrueWordTile word={ABYSS} isActive isPictureOnly />)

    expect(tile()).toHaveAttribute('data-look', 'picture')
    expect(tile()).not.toHaveClass('border', 'bg-pane')
    expect(within(tile()).getByRole('img', { name: 'Abyss' })).toHaveClass('w-full')
    expect(within(tile()).getByRole('heading', { name: 'Abyss' }).closest('header')).toHaveClass(
      'sr-only',
    )
    expect(within(tile()).getByText('5 LP').closest('header')).toHaveClass('sr-only')
    expect(within(tile()).getByText('A random card is free.')).toHaveClass('sr-only')
    expect(within(tile()).getByText('● Aktif')).not.toHaveClass('sr-only')
    // An active word still glows purple.
    expect(tile()).toHaveAttribute('data-glow', 'word')
    expect(tile()).toHaveClass('glow-word')
  })

  it('draws the whole tile when the word has no picture', () => {
    render(<TrueWordTile word={ABYSS} isPictureOnly />)

    expect(tile()).not.toHaveAttribute('data-look')
    expect(tile()).toHaveClass('border', 'bg-pane')
    expect(
      within(tile()).getByRole('heading', { name: 'Abyss' }).closest('header'),
    ).not.toHaveClass('sr-only')
    expect(within(tile()).getByText('A random card is free.')).not.toHaveClass('sr-only')
  })

  it('keeps the full tile with a picture when it is not asked for the picture alone', () => {
    withArt(<TrueWordTile word={ABYSS} />)

    expect(tile()).not.toHaveAttribute('data-look')
    expect(
      within(tile()).getByRole('heading', { name: 'Abyss' }).closest('header'),
    ).not.toHaveClass('sr-only')
  })

  it('glows gold while selected, unless it is active', () => {
    const { rerender } = withArt(<TrueWordTile word={ABYSS} isPictureOnly isSelected />)
    expect(tile()).toHaveAttribute('data-glow', 'selected')
    expect(tile()).toHaveClass('drop-shadow-glow-selected')

    rerender(
      <TestArtProvider manifest={ART}>
        <TrueWordTile word={ABYSS} isPictureOnly isSelected isActive />
      </TestArtProvider>,
    )
    expect(tile()).toHaveAttribute('data-glow', 'word')
    expect(tile()).not.toHaveClass('drop-shadow-glow-selected')
  })
})
