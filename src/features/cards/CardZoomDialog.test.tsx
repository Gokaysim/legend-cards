import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { testPicturePath, testPictureUrl } from '@/test/artFixtures'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { TestArtProvider } from '@/test/TestArtProvider'

import { CardZoomDialog } from './CardZoomDialog'

const ABOLETH = testCard("Aboleth's Eyes", {
  cost: '3',
  setCode: 'Kesqer',
  rarity: 'common',
  mechanicPack: 'Arcanus Divine',
  text: 'For the rest of this combat, gain Immune to any Illusion effect.',
  picture: testPicturePath('card', 'legend-abolethseyes'),
})
const ABOLETH_URL = testPictureUrl(testPicturePath('card', 'legend-abolethseyes'))

/** Renders with the test pictures: only Aboleth's Eyes has one. */
const renderWithArt = (ui: ReactNode) => render(<TestArtProvider>{ui}</TestArtProvider>)

const zoom = (name: string) => screen.getByRole('dialog', { name })

describe('CardZoomDialog', () => {
  it("shows only the card's picture and a small close button, named after the card", () => {
    renderWithArt(<CardZoomDialog card={ABOLETH} onClose={vi.fn()} />)

    const dialog = zoom("Aboleth's Eyes")
    expect(dialog).toHaveAttribute('open')
    expect(within(dialog).getByRole('img', { name: "Aboleth's Eyes" })).toHaveAttribute(
      'src',
      ABOLETH_URL,
    )
    expect(within(dialog).queryByRole('heading')).not.toBeInTheDocument()
    expect(dialog).not.toHaveTextContent('Kesqerian Nights')
    expect(dialog).not.toHaveTextContent('Cost')
    expect(dialog).not.toHaveTextContent('Common')
    expect(within(dialog).getByRole('button', { name: 'Kapat' })).toHaveTextContent('✕')
  })

  it.each([
    [
      'Blessed',
      testBlessedCard('Second Wind', { picture: testPicturePath('card', 'blessed-wind') }),
    ],
    [
      'Cursed · Cost 1',
      testCursedCard('Abandon All Hope', {
        cost: '1',
        picture: testPicturePath('card', 'cursed-hope'),
      }),
    ],
  ])('shows a card with a picture alone, without the line "%s"', (line, card) => {
    renderWithArt(<CardZoomDialog card={card} onClose={vi.fn()} />)

    const dialog = zoom(card.name)
    expect(within(dialog).getByRole('img', { name: card.name })).toBeInTheDocument()
    expect(dialog).not.toHaveTextContent(line)
  })

  it('opens outside the page it came from, in the document body', () => {
    const { container } = renderWithArt(<CardZoomDialog card={ABOLETH} onClose={vi.fn()} />)

    expect(container).not.toContainElement(zoom("Aboleth's Eyes"))
    expect(zoom("Aboleth's Eyes").parentElement).toBe(document.body)
  })

  it('shows a cheaper hand cost as a badge on the picture, marked lower', () => {
    renderWithArt(<CardZoomDialog card={ABOLETH} handCost="1" onClose={vi.fn()} />)

    const dialog = zoom("Aboleth's Eyes")
    const badge = within(dialog).getByText(/^Cost:/).parentElement
    expect(badge).toHaveTextContent('Cost: 1 (bu elde daha düşük; temel cost: 3)')
    expect(badge).toHaveAttribute('data-cost-change', 'lower')
    expect(badge).toHaveClass('absolute', 'text-green')
  })

  it('shows no badge from the library, nor for a hand cost equal to the card cost', () => {
    renderWithArt(
      <>
        <CardZoomDialog card={ABOLETH} onClose={vi.fn()} />
        <CardZoomDialog card={ABOLETH} handCost="3" onClose={vi.fn()} />
      </>,
    )

    for (const dialog of screen.getAllByRole('dialog', { name: "Aboleth's Eyes" })) {
      expect(within(dialog).queryByText(/^Cost:/)).not.toBeInTheDocument()
    }
  })

  it('shows no marks, no note and no card control', () => {
    renderWithArt(<CardZoomDialog card={ABOLETH} handCost="3" onClose={vi.fn()} />)

    const dialog = zoom("Aboleth's Eyes")
    expect(dialog).not.toHaveTextContent('Aktif')
    expect(dialog).not.toHaveTextContent('Not var')
    expect(dialog).not.toHaveTextContent('Ek kopya')
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Kapat'])
  })

  it("shows the card's face without pictures, larger and without a magnifier, for a card without a picture", () => {
    renderWithArt(
      <CardZoomDialog
        card={testCard('Night Owl', { cost: '2', rarity: 'rare', text: 'Gain 1 LP at night.' })}
        onClose={vi.fn()}
      />,
    )

    const dialog = zoom('Night Owl')
    expect(within(dialog).queryByRole('img')).not.toBeInTheDocument()
    const face = within(dialog).getByRole('article', { name: 'Night Owl' })
    // The CSS face sits in its glow box, inside the zoom view's wider box.
    expect(face.parentElement?.parentElement).toHaveClass('w-80')
    expect(within(face).getByRole('heading', { name: 'Night Owl' })).not.toHaveClass('sr-only')
    expect(face).toHaveTextContent('Gain 1 LP at night.')
    expect(face).toHaveTextContent('Rare')
    expect(face).toHaveTextContent('Arcanus Divine')
    expect(within(dialog).queryByRole('button', { name: /büyüt/ })).not.toBeInTheDocument()
  })

  it('falls back to the face without pictures when the picture fails to load, keeping the hand cost', () => {
    renderWithArt(<CardZoomDialog card={ABOLETH} handCost="1" onClose={vi.fn()} />)

    fireEvent.error(within(zoom("Aboleth's Eyes")).getByRole('img'))

    const face = within(zoom("Aboleth's Eyes")).getByRole('article', { name: "Aboleth's Eyes" })
    expect(within(face).getByText(/^Cost:/).parentElement).toHaveAttribute(
      'data-cost-change',
      'lower',
    )
    expect(within(face).queryByRole('button', { name: /büyüt/ })).not.toBeInTheDocument()
  })

  it('shows a Cursed card without a picture with no set, rarity or mechanic pack', () => {
    renderWithArt(
      <CardZoomDialog
        card={testCursedCard('Scorched Earth', { cost: '1', text: 'Burn it all.' })}
        onClose={vi.fn()}
      />,
    )

    const dialog = zoom('Scorched Earth')
    const face = within(dialog).getByRole('article', { name: 'Scorched Earth' })
    expect(face).toHaveTextContent('Burn it all.')
    expect(within(face).queryByText('Set')).not.toBeInTheDocument()
    expect(within(face).queryByText('Mechanic Pack')).not.toBeInTheDocument()
  })

  it('calls onClose from its "✕" button', async () => {
    const onClose = vi.fn()
    renderWithArt(<CardZoomDialog card={ABOLETH} onClose={onClose} />)

    await userEvent.click(within(zoom("Aboleth's Eyes")).getByRole('button', { name: 'Kapat' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes with a click outside it, and not with a click on the picture', () => {
    const onClose = vi.fn()
    renderWithArt(<CardZoomDialog card={ABOLETH} onClose={onClose} />)
    const dialog = zoom("Aboleth's Eyes")
    dialog.getBoundingClientRect = () => new DOMRect(100, 50, 600, 800)
    const press = (target: Element, clientX: number, clientY: number) => {
      fireEvent.pointerDown(target, { clientX, clientY })
      fireEvent.click(target, { clientX, clientY })
    }

    press(within(dialog).getByRole('img'), 400, 400)
    expect(onClose).not.toHaveBeenCalled()

    press(dialog, 40, 400)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
