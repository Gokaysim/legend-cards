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
