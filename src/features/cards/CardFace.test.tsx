import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { testPicturePath, testPictureUrl } from '@/test/artFixtures'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { TestArtProvider } from '@/test/TestArtProvider'
import { renderWithSets } from '@/test/renderWithSets'

import { CardFace } from './CardFace'

const face = (name: string) => screen.getByRole('article', { name })

describe('CardFace', () => {
  it('shows the cost, name, visible text, official set name, rarity and mechanic pack', () => {
    renderWithSets(
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
    renderWithSets(<CardFace card={card} />)
    expect(face(card.name)).toHaveAttribute('data-frame', frame)
    expect(face(card.name)).toHaveClass(className)
  })

  it('hides the bracket text', () => {
    renderWithSets(
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
    renderWithSets(
      <>
        <CardFace card={testCard('No Cost', { cost: null })} />
        <CardFace card={testCard('Dice', { cost: 'd6' })} />
      </>,
    )
    expect(face('No Cost')).toHaveTextContent('Cost: —')
    expect(face('Dice')).toHaveTextContent('Cost: d6')
  })

  it('shows "Blessed" in place of a set, "—" as the rarity, and the mechanic pack of a Blessed card', () => {
    renderWithSets(
      <CardFace card={testBlessedCard('Dawn of Fortune', { mechanicPack: 'Risk & Reward' })} />,
    )

    const details = within(face('Dawn of Fortune'))
    expect(details.getByText('Set').nextElementSibling).toHaveTextContent('Blessed')
    expect(details.getByText('Rarity').nextElementSibling).toHaveTextContent('—')
    expect(details.getByText('Mechanic Pack').nextElementSibling).toHaveTextContent('Risk & Reward')
  })

  it('leaves out set, rarity and mechanic pack on a Cursed card', () => {
    renderWithSets(<CardFace card={testCursedCard('Visions of Death', { cost: '1' })} />)

    const card = face('Visions of Death')
    expect(card).toHaveTextContent('Cost: 1')
    expect(card).toHaveTextContent('Visions of Death text.')
    expect(within(card).queryByText('Set')).not.toBeInTheDocument()
    expect(within(card).queryByText('Rarity')).not.toBeInTheDocument()
    expect(within(card).queryByText('Mechanic Pack')).not.toBeInTheDocument()
  })
})

describe("CardFace in the DM's library", () => {
  it('marks a DM-only card "🔒 DM" when asked', () => {
    const view = renderWithSets(
      <CardFace card={testCard('The Last Wish', { dmOnly: true })} isDmOnlyMarked />,
    )
    expect(face('The Last Wish')).toHaveTextContent('🔒 DM')
    view.rerender(<CardFace card={testCard('The Last Wish', { dmOnly: true })} />)
    expect(face('The Last Wish')).not.toHaveTextContent('🔒 DM')
  })
})

describe('CardFace in a hand', () => {
  const cost = (name: string) => within(face(name)).getByText(/^Cost:/).parentElement

  it('shows the cost in the hand, marked lower when it is below the card cost', () => {
    renderWithSets(<CardFace card={testCard('Cheap', { cost: '3' })} handCost="1" />)

    expect(face('Cheap')).toHaveTextContent('Cost: 1')
    expect(cost('Cheap')).toHaveAttribute('data-cost-change', 'lower')
    expect(cost('Cheap')).toHaveClass('text-green')
    expect(face('Cheap')).toHaveTextContent('bu elde daha düşük; temel cost: 3')
  })

  it('marks a cost above the card cost as higher', () => {
    renderWithSets(<CardFace card={testCard('Dear', { cost: '1' })} handCost="2,5" />)

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
    renderWithSets(<CardFace card={testCard('Same', { cost: cardCost })} handCost={handCost} />)

    expect(cost('Same')).not.toHaveAttribute('data-cost-change')
    expect(face('Same')).not.toHaveTextContent('bu elde')
  })

  it('shows the hand cost in place of the card cost', () => {
    renderWithSets(<CardFace card={testCard('Dice', { cost: '2' })} handCost="d6" />)
    expect(face('Dice')).toHaveTextContent('Cost: d6')
  })

  it('marks an active card in its frame color', () => {
    renderWithSets(
      <>
        <CardFace card={testCard('Owl', { rarity: 'rare' })} handCost="1" isActive />
        <CardFace card={testCursedCard('Hex')} handCost="1" isActive />
      </>,
    )

    expect(within(face('Owl')).getByText('● Aktif')).toHaveClass('border-gold')
    expect(within(face('Hex')).getByText('● Aktif')).toHaveClass('border-cursed')
  })

  it('marks an extra copy, and shows a note as the icon in the bottom-left corner instead of a mark', () => {
    renderWithSets(<CardFace card={testCard('Owl')} handCost="1" hasNote isExtraCopy />)

    const card = face('Owl')
    const marks = card.querySelector('[data-marks]')
    expect(marks).toHaveTextContent('Ek kopya')
    expect(marks).not.toHaveTextContent('Not var')
    // Screen readers read "Not var" at all times; the icon itself is only seen.
    expect(within(card).getByText('Not var')).toHaveClass('sr-only')
    const icon = card.querySelector('[data-note-icon]')
    expect(icon).toHaveTextContent('✎')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveClass('absolute', 'bottom-2', 'left-2', 'pointer-events-none')
    // Room for the icon below the text.
    expect(card).toHaveClass('pb-10')
  })

  it('shows the note icon on hover or keyboard focus, and at all times without hover', () => {
    renderWithSets(<CardFace card={testCard('Owl')} handCost="1" hasNote />)

    expect(face('Owl').querySelector('[data-note-icon]')).toHaveClass(
      'opacity-0',
      'group-hover:opacity-100',
      'group-has-[:focus-visible]:opacity-100',
      'no-hover:opacity-100',
    )
    expect(face('Owl')).toHaveClass('group')
  })

  it('has no marks row when the note is its only mark', () => {
    renderWithSets(<CardFace card={testCard('Owl')} handCost="1" hasNote />)

    expect(face('Owl').querySelector('[data-marks]')).toBeNull()
  })

  it('shows no marks without them, and none outside a hand', () => {
    renderWithSets(
      <>
        <CardFace card={testCard('Plain')} handCost="1" />
        <CardFace card={testCard('Library')} />
      </>,
    )

    for (const name of ['Plain', 'Library']) {
      expect(face(name)).not.toHaveTextContent('Aktif')
      expect(face(name)).not.toHaveTextContent('Not var')
      expect(face(name)).not.toHaveTextContent('Ek kopya')
      expect(face(name).querySelector('[data-note-icon]')).toBeNull()
      expect(face(name)).not.toHaveClass('pb-10')
    }
  })
})

describe('CardFace magnifier', () => {
  const magnifier = (name: string) =>
    within(face(name)).getByRole('button', { name: `${name}: büyüt` })

  it('sits in the top-right corner, shown on hover or keyboard focus, and at all times without hover', () => {
    renderWithSets(<CardFace card={testCard('Night Owl')} />)

    expect(magnifier('Night Owl')).toHaveClass(
      'absolute',
      'top-2',
      'right-2',
      'opacity-0',
      'group-hover:opacity-100',
      'group-has-[:focus-visible]:opacity-100',
      'no-hover:opacity-100',
    )
    expect(magnifier('Night Owl')).toHaveTextContent('🔍')
    expect(face('Night Owl')).toHaveClass('group', 'relative')
  })

  it('leaves out the magnifier when the face is not zoomable', () => {
    renderWithSets(<CardFace card={testCard('Night Owl')} isZoomable={false} />)

    expect(within(face('Night Owl')).queryByRole('button')).not.toBeInTheDocument()
  })

  it('opens the zoom view outside the face, and gives the focus back to the magnifier when it closes', async () => {
    const user = userEvent.setup()
    renderWithSets(<CardFace card={testCard('Night Owl', { cost: '2', rarity: 'rare' })} />)
    // The zoom view shows the face without pictures again, so the page's face is taken first.
    const card = face('Night Owl')

    await user.click(magnifier('Night Owl'))

    const zoom = screen.getByRole('dialog', { name: 'Night Owl' })
    expect(zoom).not.toHaveTextContent('Kesqerian Nights · Cost 2 · Rare')
    expect(card).not.toContainElement(zoom)

    await user.click(within(zoom).getByRole('button', { name: 'Kapat' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(magnifier('Night Owl')).toHaveFocus()
  })

  it('closes the zoom view when the browser closes it, as on Escape, and gives the focus back', async () => {
    const user = userEvent.setup()
    renderWithSets(<CardFace card={testCard('Night Owl')} />)

    await user.click(magnifier('Night Owl'))
    const zoom = screen.getByRole<HTMLDialogElement>('dialog', { name: 'Night Owl' })
    act(() => zoom.close())

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(magnifier('Night Owl')).toHaveFocus()
  })

  it('zooms a hand card with its cost in the hand', async () => {
    const user = userEvent.setup()
    renderWithSets(
      <CardFace card={testCard('Night Owl', { cost: '3' })} handCost="1" isActive hasNote />,
    )

    await user.click(magnifier('Night Owl'))

    const zoom = screen.getByRole('dialog', { name: 'Night Owl' })
    expect(zoom).not.toHaveTextContent('Cost 1 (temel: 3)')
    expect(within(zoom).getByText(/^Cost:/).parentElement).toHaveAttribute(
      'data-cost-change',
      'lower',
    )
    expect(zoom).not.toHaveTextContent('Aktif')
    expect(zoom).not.toHaveTextContent('Not var')
  })
})

describe('CardFace opened as a whole', () => {
  it('opens with onOpen from the face, first in the Tab order, below the magnifier', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    renderWithSets(
      <CardFace
        card={testCard('Night Owl')}
        handCost="1"
        onOpen={onOpen}
        openLabel="Night Owl: ayrıntılar"
      />,
    )

    const open = within(face('Night Owl')).getByRole('button', { name: 'Night Owl: ayrıntılar' })
    const zoomButton = within(face('Night Owl')).getByRole('button', { name: 'Night Owl: büyüt' })
    expect(open).toHaveClass('absolute', 'z-1', 'hover:bg-ink/5')
    expect(zoomButton).toHaveClass('z-20')

    await user.tab()
    expect(open).toHaveFocus()
    await user.tab()
    expect(zoomButton).toHaveFocus()

    await user.click(open)
    expect(onOpen).toHaveBeenCalledOnce()

    await user.click(zoomButton)
    expect(onOpen).toHaveBeenCalledOnce()
    expect(screen.getByRole('dialog', { name: 'Night Owl' })).toBeInTheDocument()
  })

  it('has no whole-face control without onOpen', () => {
    renderWithSets(<CardFace card={testCard('Night Owl')} />)

    expect(within(face('Night Owl')).getAllByRole('button')).toHaveLength(1)
  })
})

const ABOLETH = testCard("Aboleth's Eyes", {
  cost: '3',
  setCode: 'Kesqer',
  rarity: 'common',
  mechanicPack: 'Arcanus Divine',
  text: 'For the rest of this combat, gain Immune to any Illusion effect.',
  picture: testPicturePath('card', 'legend-abolethseyes'),
})
const ABOLETH_URL = testPictureUrl(testPicturePath('card', 'legend-abolethseyes'))
const HEX_WITH_PICTURE = testCursedCard('Hex', { picture: testPicturePath('card', 'cursed-hex') })

/** Renders with the test pictures: Aboleth's Eyes and the Cursed card Hex have one. */
const renderWithArt = (ui: ReactNode) => renderWithSets(<TestArtProvider>{ui}</TestArtProvider>)

describe('CardFace with a picture', () => {
  it('shows the picture without a frame of its own, with no text under it', () => {
    renderWithArt(<CardFace card={ABOLETH} />)

    const card = face("Aboleth's Eyes")
    const picture = within(card).getByRole('img', { name: "Aboleth's Eyes" })
    expect(picture).toHaveAttribute('src', ABOLETH_URL)
    expect(picture).toHaveAttribute('loading', 'lazy')
    expect(card).toHaveAttribute('data-frame', 'common')
    // The picture's printed frame shows the kind: no CSS frame around it.
    expect(card.className).not.toMatch(/\bborder-/)
    expect(card).not.toHaveClass('bg-pane-raised')
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
    renderWithArt(<CardFace card={HEX_WITH_PICTURE} />)

    const card = face('Hex')
    expect(within(card).getByRole('img', { name: 'Hex' })).toBeInTheDocument()
    expect(card).toHaveAttribute('data-frame', 'cursed')
    expect(within(card).queryByText('Set')).not.toBeInTheDocument()
    expect(
      within(card).queryByRole('button', { name: 'Set, rarity ve mechanic pack' }),
    ).not.toBeInTheDocument()
  })

  it("keeps a marked hand card's marks, and puts its note icon and magnifier in the picture's corners", () => {
    renderWithArt(<CardFace card={ABOLETH} handCost="3" isActive hasNote />)

    const card = face("Aboleth's Eyes")
    const picture = within(card).getByRole('img', { name: "Aboleth's Eyes" })
    expect(within(card).getByText('● Aktif')).toHaveClass('border-common')
    expect(card.querySelector('[data-marks]')).not.toHaveTextContent('Not var')
    expect(within(card).getByText('Not var')).toHaveClass('sr-only')
    const icon = card.querySelector('[data-note-icon]')
    expect(picture.parentElement).toContainElement(icon as HTMLElement)
    expect(icon).toHaveClass('bottom-[2%]', 'left-[3%]')
    const magnifier = within(card).getByRole('button', { name: "Aboleth's Eyes: büyüt" })
    expect(picture.parentElement).toContainElement(magnifier)
    expect(magnifier).toHaveClass('top-[2%]', 'right-[3%]')
    // The picture face needs no room below its picture for the icon.
    expect(card).not.toHaveClass('pb-10')
  })

  it("zooms a picture face to the card's picture", async () => {
    const user = userEvent.setup()
    renderWithArt(<CardFace card={ABOLETH} />)

    await user.click(within(face("Aboleth's Eyes")).getByRole('button', { name: /büyüt/ }))

    const zoom = screen.getByRole('dialog', { name: "Aboleth's Eyes" })
    expect(within(zoom).getByRole('img', { name: "Aboleth's Eyes" })).toHaveAttribute(
      'src',
      ABOLETH_URL,
    )
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

/** The face's glow, from its glow box: around a CSS face, or around a picture inside the face. */
const glowOf = (card: HTMLElement) =>
  (card.closest('[data-glow]') ?? card.querySelector('[data-glow]'))?.getAttribute('data-glow') ??
  null

describe('CardFace glow', () => {
  it.each([
    ['a Common card', testCard('C', { rarity: 'common' }), 'active'],
    ['a Rare card', testCard('R', { rarity: 'rare' }), 'active'],
    ['a Cursed card', testCursedCard('X'), 'active-cursed'],
    ['a Blessed card', testBlessedCard('B'), 'active-blessed'],
  ])('makes an active %s glow by its kind', (_case, card, glow) => {
    renderWithSets(<CardFace card={card} handCost={card.cost} isActive />)
    expect(glowOf(face(card.name))).toBe(glow)
  })

  it('gives an inactive hand card no glow', () => {
    renderWithSets(<CardFace card={testCard('Owl')} handCost="1" />)
    expect(glowOf(face('Owl'))).toBeNull()
  })

  it.each([
    ['a Common card', testCard('C', { rarity: 'common' }), 'reveal-common'],
    ['a Rare card', testCard('R', { rarity: 'rare' }), 'reveal-rare'],
    ['a Cursed card', testCursedCard('X'), 'reveal-cursed'],
    ['a Blessed card', testBlessedCard('B'), 'reveal-blessed'],
  ])('makes a revealed %s glow by its kind', (_case, card, glow) => {
    renderWithSets(<CardFace card={card} isRevealed />)
    expect(glowOf(face(card.name))).toBe(glow)
  })

  it('makes a held library card glow, and a card in the pool not', () => {
    renderWithSets(
      <>
        <CardFace card={testCard('Held')} heldBy={['Ayla']} />
        <CardFace card={testCard('Free')} />
      </>,
    )
    expect(glowOf(face('Held'))).toBe('held')
    expect(face('Held')).toHaveTextContent('Elde: Ayla')
    expect(glowOf(face('Free'))).toBeNull()
  })

  it("lets an active card's state win over its kind", () => {
    renderWithSets(
      <CardFace card={testCard('R', { rarity: 'rare' })} handCost="1" isActive isRevealed />,
    )
    expect(glowOf(face('R'))).toBe('active')
  })

  it('makes a selected hand card glow gold, and marks its open control as current', () => {
    renderWithSets(
      <>
        <CardFace card={testCard('Owl')} handCost="1" isSelected onOpen={vi.fn()} openLabel="Owl" />
        <CardFace card={testCard('Bat')} handCost="1" onOpen={vi.fn()} openLabel="Bat" />
      </>,
    )
    expect(glowOf(face('Owl'))).toBe('selected')
    expect(face('Owl').closest('[data-glow]')).toHaveClass('drop-shadow-glow-selected')
    expect(screen.getByRole('button', { name: 'Owl' })).toHaveAttribute('aria-current', 'true')
    expect(glowOf(face('Bat'))).toBeNull()
    expect(screen.getByRole('button', { name: 'Bat' })).not.toHaveAttribute('aria-current')
  })

  it('keeps the active glow of a selected active card', () => {
    renderWithSets(
      <CardFace
        card={testCursedCard('X')}
        handCost="1"
        isActive
        isSelected
        onOpen={vi.fn()}
        openLabel="X"
      />,
    )
    expect(glowOf(face('X'))).toBe('active-cursed')
    expect(screen.getByRole('button', { name: 'X' })).toHaveAttribute('aria-current', 'true')
  })

  it('glows around the picture, and keeps the face mounted when the glow changes', () => {
    const { rerender } = renderWithArt(<CardFace card={ABOLETH} handCost="3" />)
    const picture = within(face("Aboleth's Eyes")).getByRole('img')
    expect(glowOf(face("Aboleth's Eyes"))).toBeNull()

    rerender(
      <TestArtProvider>
        <CardFace card={ABOLETH} handCost="3" isActive />
      </TestArtProvider>,
    )

    const box = face("Aboleth's Eyes").querySelector('[data-glow]')
    expect(box).toHaveAttribute('data-glow', 'active')
    expect(box).toHaveClass('drop-shadow-glow-active')
    expect(box).toContainElement(picture)
    expect(within(face("Aboleth's Eyes")).getByRole('img')).toBe(picture)
  })

  it("lifts a picture's box above the whole-face control, letting the pointer through but not on its controls", () => {
    renderWithArt(<CardFace card={ABOLETH} handCost="3" isActive onOpen={() => undefined} />)

    const card = face("Aboleth's Eyes")
    const box = card.querySelector('[data-glow]')
    expect(box).toHaveClass('z-2', 'pointer-events-none')
    expect(within(card).getByRole('button', { name: "Aboleth's Eyes: büyüt" })).toHaveClass(
      'pointer-events-auto',
    )
    expect(within(card).getByRole('button', { name: 'Set, rarity ve mechanic pack' })).toHaveClass(
      'pointer-events-auto',
    )
  })
})

describe('CardFace double click', () => {
  const magnifier = (name: string) => screen.getByRole('button', { name: `${name}: büyüt` })

  it('zooms a face on a double click with a mouse, and gives the focus to the magnifier on close', async () => {
    const user = userEvent.setup()
    renderWithSets(<CardFace card={testCard('Night Owl', { cost: '2', rarity: 'rare' })} />)

    await user.dblClick(within(face('Night Owl')).getByRole('heading', { name: 'Night Owl' }))

    const zoom = screen.getByRole<HTMLDialogElement>('dialog', { name: 'Night Owl' })
    act(() => zoom.close())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(magnifier('Night Owl')).toHaveFocus()
  })

  it('zooms a picture face on a double click, and the hand face beside the details too', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    renderWithSets(
      <TestArtProvider>
        <CardFace
          card={testCard("Aboleth's Eyes", { picture: testPicturePath('card', 'legend-eyes') })}
          handCost="1"
          onOpen={onOpen}
          openLabel="Aboleth's Eyes: ayrıntılar"
        />
      </TestArtProvider>,
    )

    await user.dblClick(screen.getByRole('button', { name: "Aboleth's Eyes: ayrıntılar" }))

    expect(onOpen).toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: "Aboleth's Eyes" })).toBeInTheDocument()
  })

  it('does not zoom on a double tap', () => {
    renderWithSets(<CardFace card={testCard('Night Owl')} />)
    const card = face('Night Owl')

    fireEvent.pointerDown(card, { pointerType: 'touch' })
    fireEvent.click(card, { detail: 1 })
    fireEvent.pointerDown(card, { pointerType: 'touch' })
    fireEvent.click(card, { detail: 2 })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // The same two presses with a mouse zoom it.
    fireEvent.pointerDown(card, { pointerType: 'mouse' })
    fireEvent.click(card, { detail: 1 })
    fireEvent.pointerDown(card, { pointerType: 'mouse' })
    fireEvent.click(card, { detail: 2 })

    expect(screen.getByRole('dialog', { name: 'Night Owl' })).toBeInTheDocument()
  })

  it('does not zoom when the first press landed somewhere else', () => {
    renderWithSets(<CardFace card={testCard('Night Owl')} />)
    const card = face('Night Owl')

    // As on a turned card, or a face in a dialog that opened under the pointer: only the second press is its own.
    fireEvent.pointerDown(card, { pointerType: 'mouse' })
    fireEvent.click(card, { detail: 2 })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not zoom from a double click on the edit control', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    renderWithSets(<CardFace card={testCard('Night Owl')} onEdit={onEdit} />)

    await user.dblClick(screen.getByRole('button', { name: 'Night Owl: düzenle' }))

    expect(onEdit).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not zoom on a double click where its first click opens a dialog', async () => {
    const user = userEvent.setup()
    renderWithSets(
      <CardFace
        card={testCard('Night Owl')}
        onOpen={vi.fn()}
        openLabel="Night Owl: ayrıntılar"
        zoomsOnDoubleClick={false}
      />,
    )

    await user.dblClick(screen.getByRole('button', { name: 'Night Owl: ayrıntılar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(magnifier('Night Owl'))
    expect(screen.getByRole('dialog', { name: 'Night Owl' })).toBeInTheDocument()
  })
})
