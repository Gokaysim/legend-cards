import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { testArt } from '@/test/artFixtures'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { TestArtProvider } from '@/test/TestArtProvider'

import { CardFace } from './CardFace'

const face = (name: string) => screen.getByRole('article', { name })

describe('CardFace', () => {
  it('shows the cost, name, visible text, official set name, rarity and mechanic pack', () => {
    render(
      <CardFace
        card={testCard('Night Owl', {
          cost: '2',
          setCode: 'Kesqer',
          rarity: 'rare',
          mechanicPack: 'Legends of Old',
          text: 'Gain 1 LP at night.',
        })}
      />,
    )

    const card = face('Night Owl')
    expect(within(card).getByRole('heading', { name: 'Night Owl' })).toBeInTheDocument()
    expect(card).toHaveTextContent('Cost: 2')
    expect(card).toHaveTextContent('Gain 1 LP at night.')
    expect(card).toHaveTextContent('Kesqerian Nights')
    expect(card).toHaveTextContent('Rare')
    expect(card).toHaveTextContent('Legends of Old')
  })

  it.each([
    ['a Common card', testCard('C', { rarity: 'common' }), 'common', 'border-common'],
    ['a Rare card', testCard('R', { rarity: 'rare' }), 'rare', 'border-gold'],
    ['a Blessed card', testBlessedCard('B'), 'blessed', 'border-blessed'],
    ['a Cursed card', testCursedCard('X'), 'cursed', 'border-cursed'],
  ])('frames %s by its kind', (_case, card, frame, className) => {
    render(<CardFace card={card} />)
    expect(face(card.name)).toHaveAttribute('data-frame', frame)
    expect(face(card.name)).toHaveClass(className)
  })

  it('hides the bracket text', () => {
    render(
      <CardFace
        card={testCard("Hrolf's Hornswaggle", {
          text: '[Uno] Add +10 a d20 roll. If this is your only card, add +20.',
        })}
      />,
    )
    expect(face("Hrolf's Hornswaggle")).toHaveTextContent(
      'Add +10 a d20 roll. If this is your only card, add +20.',
    )
    expect(face("Hrolf's Hornswaggle")).not.toHaveTextContent('Uno')
  })

  it('shows a missing cost as "—" and keeps a cost such as d6 as written', () => {
    render(
      <>
        <CardFace card={testCard('No Cost', { cost: null })} />
        <CardFace card={testCard('Dice', { cost: 'd6' })} />
      </>,
    )
    expect(face('No Cost')).toHaveTextContent('Cost: —')
    expect(face('Dice')).toHaveTextContent('Cost: d6')
  })

  it('shows "Blessed" in place of a set, "—" as the rarity, and the mechanic pack of a Blessed card', () => {
    render(
      <CardFace card={testBlessedCard('Dawn of Fortune', { mechanicPack: 'Risk & Reward' })} />,
    )

    const details = within(face('Dawn of Fortune'))
    expect(details.getByText('Set').nextElementSibling).toHaveTextContent('Blessed')
    expect(details.getByText('Rarity').nextElementSibling).toHaveTextContent('—')
    expect(details.getByText('Mechanic Pack').nextElementSibling).toHaveTextContent('Risk & Reward')
  })

  it('leaves out set, rarity and mechanic pack on a Cursed card', () => {
    render(<CardFace card={testCursedCard('Visions of Death', { cost: '1' })} />)

    const card = face('Visions of Death')
    expect(card).toHaveTextContent('Cost: 1')
    expect(card).toHaveTextContent('Visions of Death text.')
    expect(within(card).queryByText('Set')).not.toBeInTheDocument()
    expect(within(card).queryByText('Rarity')).not.toBeInTheDocument()
    expect(within(card).queryByText('Mechanic Pack')).not.toBeInTheDocument()
  })
})

describe('CardFace in a hand', () => {
  const cost = (name: string) => within(face(name)).getByText(/^Cost:/).parentElement

  it('shows the cost in the hand, marked lower when it is below the card cost', () => {
    render(<CardFace card={testCard('Cheap', { cost: '3' })} handCost="1" />)

    expect(face('Cheap')).toHaveTextContent('Cost: 1')
    expect(cost('Cheap')).toHaveAttribute('data-cost-change', 'lower')
    expect(cost('Cheap')).toHaveClass('text-green')
    expect(face('Cheap')).toHaveTextContent('bu elde daha düşük; temel cost: 3')
  })

  it('marks a cost above the card cost as higher', () => {
    render(<CardFace card={testCard('Dear', { cost: '1' })} handCost="2,5" />)

    expect(cost('Dear')).toHaveAttribute('data-cost-change', 'higher')
    expect(cost('Dear')).toHaveClass('text-cursed')
    expect(face('Dear')).toHaveTextContent('bu elde daha yüksek')
  })

  it.each([
    ['an equal cost', '3', '3'],
    ['a cost written another way but equal', '3', '3,0'],
    ['a non-numeric hand cost', '3', 'X'],
    ['a non-numeric card cost', 'd6', '2'],
    ['no hand cost', null, null],
  ])('does not mark %s', (_case, cardCost, handCost) => {
    render(<CardFace card={testCard('Same', { cost: cardCost })} handCost={handCost} />)

    expect(cost('Same')).not.toHaveAttribute('data-cost-change')
    expect(face('Same')).not.toHaveTextContent('bu elde')
  })

  it('shows the hand cost in place of the card cost', () => {
    render(<CardFace card={testCard('Dice', { cost: '2' })} handCost="d6" />)
    expect(face('Dice')).toHaveTextContent('Cost: d6')
  })

  it('marks an active card in its frame color', () => {
    render(
      <>
        <CardFace card={testCard('Owl', { rarity: 'rare' })} handCost="1" isActive />
        <CardFace card={testCursedCard('Hex')} handCost="1" isActive />
      </>,
    )

    expect(within(face('Owl')).getByText('● Aktif')).toHaveClass('border-gold')
    expect(within(face('Hex')).getByText('● Aktif')).toHaveClass('border-cursed')
  })

  it('marks a card with a note and an extra copy', () => {
    render(<CardFace card={testCard('Owl')} handCost="1" hasNote isExtraCopy />)

    expect(face('Owl')).toHaveTextContent('✎ Not var')
    expect(face('Owl')).toHaveTextContent('Ek kopya')
  })

  it('shows no marks without them, and none outside a hand', () => {
    render(
      <>
        <CardFace card={testCard('Plain')} handCost="1" />
        <CardFace card={testCard('Library')} />
      </>,
    )

    for (const name of ['Plain', 'Library']) {
      expect(face(name)).not.toHaveTextContent('Aktif')
      expect(face(name)).not.toHaveTextContent('Not var')
      expect(face(name)).not.toHaveTextContent('Ek kopya')
    }
  })
})

const ABOLETH = testCard("Aboleth's Eyes", {
  cost: '3',
  setCode: 'Kesqer',
  rarity: 'common',
  mechanicPack: 'Arcanus Divine',
  text: 'For the rest of this combat, gain Immune to any Illusion effect.',
})
const ABOLETH_URL = '/art/cards/legend-abolethseyes.0123456789.webp'
const ART = testArt({
  cards: {
    [ABOLETH.id]: ABOLETH_URL,
    'cursed-hex': '/art/cards/cursed-hex.0123456789.webp',
  },
})

/** Renders with the test pictures: Aboleth's Eyes and the Cursed card Hex have one. */
const renderWithArt = (ui: ReactNode) =>
  render(<TestArtProvider manifest={ART}>{ui}</TestArtProvider>)

describe('CardFace with a picture', () => {
  it("shows the picture in the kind's frame, with no text under it", () => {
    renderWithArt(<CardFace card={ABOLETH} />)

    const card = face("Aboleth's Eyes")
    const picture = within(card).getByRole('img', { name: "Aboleth's Eyes" })
    expect(picture).toHaveAttribute('src', ABOLETH_URL)
    expect(picture).toHaveAttribute('loading', 'lazy')
    expect(card).toHaveAttribute('data-frame', 'common')
    expect(card).toHaveClass('border-common')
    // Only the picture and its overlays take room: the details sit inside the picture's box.
    const details = within(card).getByText('Set').closest('dl')
    expect(picture.parentElement).toContainElement(details)
  })

  it('shows the set, rarity and mechanic pack in a note on the set symbol, on hover or tap', async () => {
    const user = userEvent.setup()
    renderWithArt(<CardFace card={ABOLETH} />)

    const card = face("Aboleth's Eyes")
    const symbol = within(card).getByRole('button', { name: 'Set, rarity ve mechanic pack' })
    const note = within(card).getByText('Set').closest('dl')?.parentElement
    expect(symbol).toHaveAccessibleDescription(/Kesqerian Nights.*Common.*Arcanus Divine/)
    // Transparent until the pointer rests on the symbol, but still read by screen readers.
    expect(note).toHaveClass('opacity-0', 'peer-hover:opacity-100', 'pointer-events-none')
    expect(within(card).getByText('Set').nextElementSibling).toHaveTextContent('Kesqerian Nights')
    expect(within(card).getByText('Rarity').nextElementSibling).toHaveTextContent('Common')
    expect(within(card).getByText('Mechanic Pack').nextElementSibling).toHaveTextContent(
      'Arcanus Divine',
    )

    await user.click(symbol)
    expect(note).toHaveAttribute('data-shown', 'true')
    expect(note).toHaveClass('opacity-100')

    await user.tab()
    expect(note).not.toHaveAttribute('data-shown')
  })

  it('keeps the cost, name and text for screen readers, without drawing them', () => {
    renderWithArt(<CardFace card={ABOLETH} />)

    const card = face("Aboleth's Eyes")
    const name = within(card).getByRole('heading', { name: "Aboleth's Eyes" })
    expect(name).toHaveClass('sr-only')
    expect(within(card).getByText(/gain Immune to any Illusion effect/)).toHaveClass('sr-only')
    expect(card).toHaveTextContent('Cost: 3')
    expect(
      within(card)
        .getByText(/^Cost:/)
        .closest('.sr-only'),
    ).not.toBeNull()
  })

  it('gives a Cursed card no note on its symbol', () => {
    renderWithArt(<CardFace card={testCursedCard('Hex')} />)

    const card = face('Hex')
    expect(within(card).getByRole('img', { name: 'Hex' })).toBeInTheDocument()
    expect(card).toHaveAttribute('data-frame', 'cursed')
    expect(within(card).queryByText('Set')).not.toBeInTheDocument()
    expect(within(card).queryByRole('button')).not.toBeInTheDocument()
  })

  it("keeps a marked hand card's marks on its picture", () => {
    renderWithArt(<CardFace card={ABOLETH} handCost="3" isActive hasNote />)

    const card = face("Aboleth's Eyes")
    expect(within(card).getByRole('img', { name: "Aboleth's Eyes" })).toBeInTheDocument()
    expect(within(card).getByText('● Aktif')).toHaveClass('border-common')
    expect(card).toHaveTextContent('✎ Not var')
  })

  it('shows a cheaper hand cost as a badge on the picture, marked lower', () => {
    renderWithArt(<CardFace card={ABOLETH} handCost="1" />)

    const badge = within(face("Aboleth's Eyes")).getByText(/^Cost:/).parentElement
    expect(badge).toHaveTextContent('Cost: 1 (bu elde daha düşük; temel cost: 3)')
    expect(badge).toHaveAttribute('data-cost-change', 'lower')
    expect(badge).toHaveClass('absolute', 'text-green')
    expect(badge?.closest('.sr-only')).toBeNull()
  })

  it('marks a dearer hand cost as higher', () => {
    renderWithArt(<CardFace card={ABOLETH} handCost="5" />)

    const badge = within(face("Aboleth's Eyes")).getByText(/^Cost:/).parentElement
    expect(badge).toHaveAttribute('data-cost-change', 'higher')
    expect(badge).toHaveClass('text-cursed')
  })

  it('shows no badge when the hand cost is the card cost', () => {
    renderWithArt(<CardFace card={ABOLETH} handCost="3" />)

    const badge = within(face("Aboleth's Eyes")).getByText(/^Cost:/).parentElement
    expect(badge).not.toHaveAttribute('data-cost-change')
    expect(badge?.closest('.sr-only')).not.toBeNull()
  })

  it('keeps the CSS face for a card without a picture', () => {
    renderWithArt(<CardFace card={testCard('Scorched Earth', { text: 'Burn it all.' })} />)

    const card = face('Scorched Earth')
    expect(within(card).queryByRole('img')).not.toBeInTheDocument()
    expect(within(card).getByRole('heading', { name: 'Scorched Earth' })).not.toHaveClass('sr-only')
    expect(within(card).getByText('Burn it all.')).not.toHaveClass('sr-only')
  })

  it('falls back to the CSS face when the picture fails to load', () => {
    renderWithArt(<CardFace card={ABOLETH} handCost="1" />)

    fireEvent.error(within(face("Aboleth's Eyes")).getByRole('img'))

    const card = face("Aboleth's Eyes")
    expect(within(card).queryByRole('img')).not.toBeInTheDocument()
    expect(within(card).getByRole('heading', { name: "Aboleth's Eyes" })).not.toHaveClass('sr-only')
    expect(within(card).getByText(/^Cost:/).parentElement).toHaveAttribute(
      'data-cost-change',
      'lower',
    )
  })
})
