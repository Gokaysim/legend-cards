import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { CURSED_BACK, NEUTRAL_BACK, type SpreadBack } from '@/features/art/spreadBack'
import { testArt } from '@/test/artFixtures'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { TestArtProvider } from '@/test/TestArtProvider'

import { FaceDownCard } from './FaceDownCard'

const eyes = testCard("Aboleth's Eyes", { text: 'See everything. [scry]' })
const wind = testBlessedCard('Second Wind')

describe('FaceDownCard', () => {
  it('shows a back that tells nothing about the card', () => {
    const { container, rerender } = render(
      <FaceDownCard card={eyes} position={1} back={NEUTRAL_BACK} />,
    )
    const back = screen.getByRole('button', { name: 'Kart 1: çevir' })

    expect(container).not.toHaveTextContent("Aboleth's Eyes")
    expect(container).not.toHaveTextContent('See everything')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()

    // A Blessed card has the very same back.
    const normalBack = back.outerHTML
    rerender(<FaceDownCard card={wind} position={1} back={NEUTRAL_BACK} />)
    expect(screen.getByRole('button', { name: 'Kart 1: çevir' }).outerHTML).toBe(normalBack)
    expect(container).not.toHaveTextContent('Second Wind')
  })

  it('turns over to the face when selected, and stays revealed', async () => {
    const user = userEvent.setup()
    render(<FaceDownCard card={eyes} position={2} back={NEUTRAL_BACK} />)

    await user.click(screen.getByRole('button', { name: 'Kart 2: çevir' }))

    const face = screen.getByRole('article', { name: "Aboleth's Eyes" })
    expect(face).toHaveTextContent('See everything.')
    expect(face).not.toHaveTextContent('[scry]')
    expect(screen.getByRole('group', { name: 'Kart 2' })).toHaveFocus()
    expect(screen.getByRole('button', { hidden: true, name: 'Kart 2: çevir' })).toBeDisabled()
  })

  it('shows no glow on the back, and the kind glow on the face after the turn', async () => {
    const user = userEvent.setup()
    const { container } = render(<FaceDownCard card={wind} position={1} back={NEUTRAL_BACK} />)
    expect(container.querySelector('[data-glow]')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Kart 1: çevir' }))

    const face = screen.getByRole('article', { name: 'Second Wind' })
    expect(face.closest('[data-glow]')).toHaveAttribute('data-glow', 'reveal-blessed')
    expect(screen.getByRole('group', { name: 'Kart 1' })).toHaveClass('drop-shadow-lift')
  })

  it('marks a Cursed draw with the cursed back', () => {
    render(<FaceDownCard card={eyes} position={1} back={CURSED_BACK} />)

    const back = screen.getByRole('button', { name: 'Kart 1: çevir' })
    expect(back).toHaveClass('border-cursed')
    expect(back).toHaveTextContent('☠')
    // A card's shape at any width of the spread, as the picture has.
    expect(back).toHaveClass('aspect-[563/788]')
  })
})

describe('FaceDownCard, controlled', () => {
  it('asks to turn instead of turning on its own, and turns when told', async () => {
    const user = userEvent.setup()
    const onReveal = vi.fn()
    const { rerender } = render(
      <FaceDownCard
        card={eyes}
        position={1}
        back={NEUTRAL_BACK}
        isRevealed={false}
        onReveal={onReveal}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Kart 1: çevir' }))
    expect(onReveal).toHaveBeenCalledOnce()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()

    rerender(
      <FaceDownCard card={eyes} position={1} back={NEUTRAL_BACK} isRevealed onReveal={onReveal} />,
    )
    expect(screen.getByRole('article', { name: "Aboleth's Eyes" })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Kart 1' })).toHaveFocus()
  })

  it('does not take the focus for a card turned on another device', () => {
    const { rerender } = render(
      <FaceDownCard
        card={eyes}
        position={1}
        back={NEUTRAL_BACK}
        isRevealed={false}
        onReveal={vi.fn()}
      />,
    )
    rerender(
      <FaceDownCard card={eyes} position={1} back={NEUTRAL_BACK} isRevealed onReveal={vi.fn()} />,
    )

    expect(screen.getByRole('group', { name: 'Kart 1' })).not.toHaveFocus()
  })

  it('shows a watcher the back without a control', () => {
    render(
      <FaceDownCard
        card={eyes}
        position={3}
        back={NEUTRAL_BACK}
        isRevealed={false}
        canTurn={false}
      />,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Kart 3: kapalı' })).toBeInTheDocument()
    expect(screen.queryByText('Çevir')).not.toBeInTheDocument()
  })
})

const BACKS = testArt({
  cardbacks: {
    Kesqer: '/art/backs/kesqer.0123456789.webp',
    blessed: '/art/backs/blessed.0123456789.webp',
    cursed: '/art/backs/cursed.0123456789.webp',
  },
})
const KESQER_BACK: SpreadBack = { kind: 'set', setCode: 'Kesqer' }

/** Renders with cardback pictures for Kesqer, Blessed and Cursed. */
const renderWithBacks = (ui: ReactNode) =>
  render(<TestArtProvider manifest={BACKS}>{ui}</TestArtProvider>)

/** The picture on a back, if it has one. */
const backPicture = (position = 1) =>
  screen.getByRole('button', { name: `Kart ${position}: çevir` }).querySelector('img')

describe('FaceDownCard backs with pictures', () => {
  it("shows a set's cardback for a set spread, whatever the card", () => {
    const { rerender } = renderWithBacks(
      <FaceDownCard card={eyes} position={1} back={KESQER_BACK} />,
    )
    expect(backPicture()).toHaveAttribute('src', '/art/backs/kesqer.0123456789.webp')
    expect(backPicture()).toHaveAttribute('alt', '')
    expect(screen.getByRole('button', { name: 'Kart 1: çevir' })).toHaveTextContent('Çevir')

    // A Blessed card under the same spread shows the very same back.
    const look = screen.getByRole('button', { name: 'Kart 1: çevir' }).outerHTML
    rerender(
      <TestArtProvider manifest={BACKS}>
        <FaceDownCard card={wind} position={1} back={KESQER_BACK} />
      </TestArtProvider>,
    )
    expect(screen.getByRole('button', { name: 'Kart 1: çevir' }).outerHTML).toBe(look)
  })

  it('keeps the neutral CSS back for a neutral spread, even for a Blessed card', () => {
    renderWithBacks(<FaceDownCard card={wind} position={1} back={NEUTRAL_BACK} />)

    expect(backPicture()).toBeNull()
    expect(screen.getByRole('button', { name: 'Kart 1: çevir' })).toHaveTextContent('✦')
  })

  it('shows the Cursed cardback for a Cursed spread, whatever the card', () => {
    renderWithBacks(
      <>
        <FaceDownCard card={testCursedCard('Hex')} position={1} back={CURSED_BACK} />
        <FaceDownCard card={eyes} position={2} back={CURSED_BACK} />
      </>,
    )

    expect(backPicture(1)).toHaveAttribute('src', '/art/backs/cursed.0123456789.webp')
    expect(backPicture(2)).toHaveAttribute('src', '/art/backs/cursed.0123456789.webp')
  })

  it('falls back to the neutral back for a set without a cardback picture', () => {
    renderWithBacks(
      <FaceDownCard card={eyes} position={1} back={{ kind: 'set', setCode: 'Ulagal' }} />,
    )

    expect(backPicture()).toBeNull()
    expect(screen.getByRole('button', { name: 'Kart 1: çevir' })).toHaveClass('border-gold')
  })

  it('falls back to the CSS back when the cardback fails to load', () => {
    renderWithBacks(<FaceDownCard card={eyes} position={1} back={CURSED_BACK} />)

    fireEvent.error(backPicture() as HTMLImageElement)

    expect(backPicture()).toBeNull()
    expect(screen.getByRole('button', { name: 'Kart 1: çevir' })).toHaveClass('border-cursed')
  })

  it('shows a watcher the cardback without the turn label', () => {
    renderWithBacks(
      <FaceDownCard
        card={eyes}
        position={3}
        back={KESQER_BACK}
        isRevealed={false}
        canTurn={false}
      />,
    )

    const back = screen.getByRole('img', { name: 'Kart 3: kapalı' })
    expect(back.querySelector('img')).toHaveAttribute('src', '/art/backs/kesqer.0123456789.webp')
    expect(back).not.toHaveTextContent('Çevir')
  })
})

describe('FaceDownCard magnifier', () => {
  it('has no magnifier while face down, and one once turned', async () => {
    const user = userEvent.setup()
    render(<FaceDownCard card={eyes} position={1} back={NEUTRAL_BACK} />)

    expect(screen.queryByRole('button', { name: /büyüt/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Kart 1: çevir' }))

    expect(screen.getByRole('button', { name: "Aboleth's Eyes: büyüt" })).toBeInTheDocument()
  })

  it('shows the magnifier when a controlled card turns', () => {
    const { rerender } = render(
      <FaceDownCard
        card={eyes}
        position={1}
        back={NEUTRAL_BACK}
        isRevealed={false}
        onReveal={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /büyüt/ })).not.toBeInTheDocument()

    rerender(
      <FaceDownCard card={eyes} position={1} back={NEUTRAL_BACK} isRevealed onReveal={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: "Aboleth's Eyes: büyüt" })).toBeInTheDocument()
  })
})
