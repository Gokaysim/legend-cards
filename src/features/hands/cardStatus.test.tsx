import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { ONLY_FROM_DM, testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { renderApp } from '@/test/renderApp'
import { testTrueWord } from '@/test/trueWordFixtures'

import { isMarkedHeld, statusLabel } from '@/features/cards/status'

import { cardStatuses } from './cardStatus'

const ayla = testProfile({ id: 'ayla', displayName: 'Ayla' })
const bora = testProfile({ id: 'bora', displayName: 'Bora' })
const profiles = [testProfile(), ayla, bora]

const pool = testCard('Pool Card')
const eyes = testCard("Aboleth's Eyes", { holder: { uid: 'ayla', userCardId: 'ayla-eyes' } })
const halo = testBlessedCard('Second Wind')
const visions = testCursedCard('Visions of Death')
const hex = testCursedCard('Hex')

describe('cardStatuses', () => {
  it('reads the pool from the holder, and the names from the open holdings and the profiles', () => {
    const copy = testCard('Copied', { holder: null })
    const statuses = cardStatuses(
      [pool, eyes, copy, halo, visions, hex],
      [
        testHolding(eyes, 'ayla', 1000, { id: 'ayla-eyes' }),
        testHolding(eyes, 'bora', 2000, { id: 'bora-eyes-copy' }),
        testHolding(copy, 'bora', 1000),
        testHolding(halo, 'ayla', 1000),
        testHolding(visions, 'bora', 1000),
        testHolding(visions, 'ayla', 2000),
        testHolding(visions, 'ayla', 3000, { id: 'second' }),
      ],
      profiles,
    )

    expect(statuses.get(pool.id)).toEqual({ inPool: true, holderNames: [] })
    expect(statuses.get(eyes.id)).toEqual({ inPool: false, holderNames: ['Ayla', 'Bora'] })
    // A DM's extra copy that outlived the original: the card is back in the pool, the copy is still named.
    expect(statuses.get(copy.id)).toEqual({ inPool: true, holderNames: ['Bora'] })
    expect(statuses.get(halo.id)).toEqual({ inPool: true, holderNames: ['Ayla'] })
    expect(statuses.get(visions.id)).toEqual({ inPool: false, holderNames: ['Bora', 'Ayla'] })
    expect(statuses.get(hex.id)).toEqual({ inPool: false, holderNames: [] })
  })

  it('keeps drafts and retired cards out of the pool, naming those who still hold a retired card', () => {
    const draft = testCard('Lute Song', { status: 'draft' })
    const retired = testCard('Old Card', { status: 'retired' })
    const retiredBlessed = testBlessedCard('Old Blessing', { status: 'retired' })
    const statuses = cardStatuses(
      [draft, retired, retiredBlessed],
      [testHolding(retired, 'ayla', 1000)],
      profiles,
    )
    expect(statuses.get(draft.id)).toEqual({ inPool: false, holderNames: [] })
    expect(statuses.get(retired.id)).toEqual({ inPool: false, holderNames: ['Ayla'] })
    expect(statuses.get(retiredBlessed.id)).toEqual({ inPool: false, holderNames: [] })
  })

  it('keeps DM-only cards out of the pool, and names them "DM\'e özel"', () => {
    const wish = testCard('The Last Wish', { ...ONLY_FROM_DM })
    const heldWish = testCard('Held Wish', {
      ...ONLY_FROM_DM,
      holder: { uid: 'bora', userCardId: 'bora-wish' },
    })
    const secretBlessing = testBlessedCard('Secret Blessing', { ...ONLY_FROM_DM })
    const crown = testCursedCard('Crown of Ash', { ...ONLY_FROM_DM })
    const statuses = cardStatuses(
      [wish, heldWish, secretBlessing, crown],
      [testHolding(heldWish, 'bora', 1000, { id: 'bora-wish' }), testHolding(crown, 'ayla', 2000)],
      profiles,
    )
    const labelOf = (card: typeof wish) => {
      const status = statuses.get(card.id)
      if (!status) throw new Error(`No status for ${card.name}`)
      return { label: statusLabel(card, status), marked: isMarkedHeld(card, status) }
    }

    expect(statuses.get(wish.id)).toEqual({ inPool: false, holderNames: [] })
    expect(statuses.get(secretBlessing.id)).toEqual({ inPool: false, holderNames: [] })
    expect(labelOf(wish)).toEqual({ label: "DM'e özel", marked: false })
    expect(labelOf(heldWish)).toEqual({ label: "DM'e özel · Elde: Bora", marked: true })
    expect(labelOf(crown)).toEqual({ label: "DM'e özel · Elde: Ayla", marked: true })
  })

  it('names a listed card without a channel "DM\'e özel", and keeps one in any channel in the pool', () => {
    const listedOnly = testCard('Listed Only', {
      isInDraws: false,
      isInSetPacks: false,
      isInMechanicPacks: false,
    })
    const mechanicOnly = testCard('Mechanic Only', { isInDraws: false, isInSetPacks: false })
    const statuses = cardStatuses([listedOnly, mechanicOnly], [], profiles)

    expect(statuses.get(listedOnly.id)).toEqual({ inPool: false, holderNames: [] })
    expect(statusLabel(listedOnly, { inPool: false, holderNames: [] })).toBe("DM'e özel")
    expect(statuses.get(mechanicOnly.id)).toEqual({ inPool: true, holderNames: [] })
  })

  it('keeps a repeatable normal card in the pool while several players hold it', () => {
    const shared = testCard('Shared Luck', { isRepeatable: true })
    const statuses = cardStatuses(
      [shared],
      [testHolding(shared, 'ayla', 1000), testHolding(shared, 'bora', 2000, { id: 'b' })],
      profiles,
    )
    const status = statuses.get(shared.id)
    expect(status).toEqual({ inPool: true, holderNames: ['Ayla', 'Bora'] })
    expect(status && statusLabel(shared, status)).toBe('Havuzda · Elde: Ayla, Bora')
  })

  it('names the holder before its holding arrives, and a user without a profile generically', () => {
    const statuses = cardStatuses([eyes, visions], [testHolding(visions, 'ghost', 1000)], profiles)

    expect(statuses.get(eyes.id)).toEqual({ inPool: false, holderNames: ['Ayla'] })
    expect(statuses.get(visions.id)?.holderNames).toEqual(['İsimsiz oyuncu'])
  })
})

describe('statusLabel of a True Word', () => {
  const abyss = testTrueWord('Abyss')
  const justice = testTrueWord('Justice', { isInDraws: false })

  it('names those who know it, or "—", and never marks it held', () => {
    const known = { inPool: false, holderNames: ['Ayla', 'Bora'] }
    expect(statusLabel(abyss, known)).toBe('Bilenler: Ayla, Bora')
    expect(statusLabel(abyss, { inPool: false, holderNames: [] })).toBe('—')
    expect(isMarkedHeld(abyss, known)).toBe(false)
  })

  it('makes a word kept out of drafts "DM\'e özel"', () => {
    expect(statusLabel(justice, { inPool: false, holderNames: ['Bora'] })).toBe(
      "DM'e özel · Bilenler: Bora",
    )
    expect(statusLabel(justice, { inPool: false, holderNames: [] })).toBe("DM'e özel")
  })
})

describe('pool status on the card screens', () => {
  it('shows the library status and counts live as a card returns to the pool', async () => {
    const user = userEvent.setup()
    const { setCards, setHoldings } = renderApp({
      path: '/library',
      users: { profiles: ready(profiles) },
      cards: { cards: ready([pool, eyes, halo, visions]) },
      holdings: {
        openHoldings: ready([
          testHolding(eyes, 'ayla', 1000, { id: 'ayla-eyes' }),
          testHolding(halo, 'ayla', 2000),
          testHolding(visions, 'bora', 3000),
        ]),
      },
    })

    expect(screen.getByRole('article', { name: "Aboleth's Eyes" })).toHaveTextContent('Elde: Ayla')
    // In the pool: the pool card and the Blessed card. In hands: the copies of Legend cards.
    expect(screen.getByLabelText('Havuz durumu')).toHaveTextContent('Havuzda 2 · Ellerde 2')

    // Ayla uses the card on another device.
    setCards({ cards: ready([pool, { ...eyes, holder: null }, halo, visions]) })
    setHoldings({
      openHoldings: ready([testHolding(halo, 'ayla', 2000), testHolding(visions, 'bora', 3000)]),
    })

    expect(screen.getByRole('article', { name: "Aboleth's Eyes" })).not.toHaveTextContent('Elde')
    expect(screen.getByLabelText('Havuz durumu')).toHaveTextContent('Havuzda 3 · Ellerde 1')
    await user.click(screen.getByRole('button', { name: '☷ Liste' }))
    expect(screen.getByRole('row', { name: /Aboleth's Eyes/ })).toHaveTextContent('Havuzda')
    expect(screen.getByRole('row', { name: /Second Wind/ })).toHaveTextContent(
      'Havuzda · Elde: Ayla',
    )
  })

  it('shows on the Cursed tab everyone who holds a Cursed card, and the copies in hands', () => {
    renderApp({
      path: '/library?tab=cursed',
      users: { profiles: ready(profiles) },
      cards: { cards: ready([visions, hex]) },
      holdings: {
        openHoldings: ready([
          testHolding(visions, 'ayla', 1000),
          testHolding(visions, 'bora', 2000),
          testHolding(hex, 'bora', 3000),
        ]),
      },
    })

    expect(
      within(screen.getByRole('article', { name: 'Visions of Death' })).getByText(
        'Elde: Ayla, Bora',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Hex' })).toHaveTextContent('Elde: Bora')
    expect(screen.getByLabelText('Eldeki kopyalar')).toHaveTextContent('Ellerde 3')
  })
})
