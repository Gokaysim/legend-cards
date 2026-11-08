import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'

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
