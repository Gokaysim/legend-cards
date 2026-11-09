import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Card } from '@/features/cards/schema'
import { testCard, testCursedCard } from '@/test/cardFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { renderApp } from '@/test/renderApp'

import { HoldingError } from './errors'
import type { HoldingActions } from './holdingsContext'
import type { Holding } from './schema'

afterEach(() => {
  vi.restoreAllMocks()
})

const me = testProfile()
const dm = testProfile({ role: 'dm' })
const ayla = testProfile({ id: 'ayla', displayName: 'Ayla' })
const bora = testProfile({ id: 'bora', displayName: 'Bora' })

const owl: Card = testCard('Night Owl', { cost: '3' })

/** The api functions as test doubles. */
function fakeActions() {
  return {
    giveCard: vi.fn<HoldingActions['giveCard']>(() => Promise.resolve('new')),
    closeHolding: vi.fn<HoldingActions['closeHolding']>(() => Promise.resolve()),
    transferHolding: vi.fn<HoldingActions['transferHolding']>(() => Promise.resolve('new')),
    setNote: vi.fn<HoldingActions['setNote']>(() => Promise.resolve()),
    setActive: vi.fn<HoldingActions['setActive']>(() => Promise.resolve()),
    setCost: vi.fn<HoldingActions['setCost']>(() => Promise.resolve()),
  }
}

/**
 * Opens the details of `card` in the hand of `handOf`, as `viewer` (the signed-in `testUser`'s profile).
 * The card is held by `handOf` through `holding`.
 */
async function openDetails({
  viewer = me,
  handOf = me,
  holding = {},
  card = owl,
  actions = fakeActions(),
  openPackId = null,
}: {
  viewer?: typeof me
  handOf?: typeof me
  holding?: Partial<Holding>
  card?: Card
  actions?: ReturnType<typeof fakeActions>
  /** An open pack, which makes the table wait. */
  openPackId?: string | null
} = {}) {
  const user = userEvent.setup()
  const held = testHolding(card, handOf.id, 1000, { id: 'h1', ...holding })
  const cardWithHolder =
    card.kind === 'normal' ? { ...card, holder: { uid: handOf.id, userCardId: 'h1' } } : card
  const view = renderApp({
    path: `/hands/${handOf.id}`,
    users: {
      currentProfile: ready(viewer),
      profiles: ready([viewer, ...[me, ayla, bora].filter((p) => p.id !== viewer.id)]),
    },
    cards: { cards: ready([cardWithHolder]) },
    holdings: { openHoldings: ready([held]), actions },
    table: { openPackId },
  })
  await user.click(screen.getByRole('button', { name: `${card.name}: ayrıntılar` }))
  return { user, actions, held, ...view }
}

const details = () => within(screen.getByRole('dialog', { name: 'Night Owl' }))
const button = (name: string) => details().queryByRole('button', { name })

describe('HoldingDialog controls', () => {
  it('shows the holder their note and "Kullan", without the DM controls', async () => {
    await openDetails()

    expect(details().getByRole('article', { name: 'Night Owl' })).toBeInTheDocument()
    expect(details().getByText("Gökay'ın elinde")).toBeInTheDocument()
    expect(details().getByRole('textbox', { name: 'Kart notu' })).toBeInTheDocument()
    expect(button('Kullan')).toBeInTheDocument()
    expect(details().queryByRole('textbox', { name: /Bu eldeki cost/ })).not.toBeInTheDocument()
    for (const name of ['● Aktif et', 'Başkasına ver', 'At']) expect(button(name)).toBeNull()
  })

  it("shows another player's card read-only, with no actions", async () => {
    await openDetails({ handOf: ayla, holding: { note: 'Boss savaşında kullan' } })

    expect(details().getByText("Ayla'nın elinde")).toBeInTheDocument()
    expect(details().getByText('Boss savaşında kullan')).toBeInTheDocument()
    expect(details().queryByRole('textbox')).not.toBeInTheDocument()
    for (const name of ['Kullan', '● Aktif et', 'Başkasına ver', 'At'])
      expect(button(name)).toBeNull()
  })

  it('shows the DM every control on any hand', async () => {
    await openDetails({ viewer: dm, handOf: ayla })

    expect(details().getByRole('textbox', { name: 'Kart notu' })).toBeInTheDocument()
    expect(
      details().getByRole('textbox', { name: 'Bu eldeki cost (boş = temel cost: 3)' }),
    ).toBeInTheDocument()
    for (const name of ['Kullan', '● Aktif et', 'Başkasına ver', 'At']) {
      expect(button(name)).toBeInTheDocument()
    }
  })

  it('marks an extra copy', async () => {
    const user = userEvent.setup()
    renderApp({
      path: `/hands/${me.id}`,
      cards: {
        cards: ready([
          testCard('Night Owl', { cost: '3', holder: { uid: 'bora', userCardId: 'other' } }),
        ]),
      },
      holdings: { openHoldings: ready([testHolding(owl, me.id, 1000, { id: 'h1' })]) },
    })
    await user.click(screen.getByRole('button', { name: 'Night Owl: ayrıntılar' }))

    expect(details().getByText("Gökay'ın elinde · Ek kopya")).toBeInTheDocument()
  })

  it('closes with the close button', async () => {
    const { user } = await openDetails()

    await user.click(details().getByRole('button', { name: '✕ Kapat' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes when the card leaves the hand, for example on another device', async () => {
    const { setHoldings } = await openDetails()

    setHoldings({ openHoldings: ready([]) })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('HoldingDialog while a pack is open', () => {
  it('disables using, giving away and discarding, and says why', async () => {
    await openDetails({ viewer: dm, handOf: ayla, openPackId: 'pack-1' })

    for (const name of ['Kullan', 'Başkasına ver', 'At']) expect(button(name)).toBeDisabled()
    expect(details().getByText('Bir Pack açık: seçim bekleniyor.')).toBeInTheDocument()
  })

  it('keeps the active switch, the note and the cost', async () => {
    const actions = fakeActions()
    const { user } = await openDetails({ viewer: dm, handOf: ayla, actions, openPackId: 'pack-1' })

    await user.click(details().getByRole('button', { name: '● Aktif et' }))
    expect(actions.setActive).toHaveBeenCalledExactlyOnceWith('h1', true)
    expect(details().getByRole('textbox', { name: 'Kart notu' })).toBeEnabled()
    expect(details().getByRole('textbox', { name: /Bu eldeki cost/ })).toBeEnabled()
  })
})

describe('HoldingDialog notes and cost', () => {
  it("saves the holder's note when the field is left, and only when it changed", async () => {
    const { user, actions } = await openDetails({ holding: { note: 'Eski' } })
    const field = details().getByRole('textbox', { name: 'Kart notu' })

    await user.click(field)
    await user.tab()
    expect(actions.setNote).not.toHaveBeenCalled()

    await user.clear(field)
    await user.type(field, 'Boss savaşında kullan')
    expect(actions.setNote).not.toHaveBeenCalled()
    await user.tab()

    expect(actions.setNote).toHaveBeenCalledExactlyOnceWith('h1', 'Boss savaşında kullan')
    expect(field).toHaveValue('Boss savaşında kullan')
  })

  it('lets the DM set a cost and clear it again', async () => {
    const { user, actions } = await openDetails({ viewer: dm, handOf: ayla })
    const field = details().getByRole('textbox', { name: /Bu eldeki cost/ })

    await user.type(field, ' 1 ')
    await user.tab()
    expect(actions.setCost).toHaveBeenLastCalledWith('h1', '1')
  })

  it('restores the card cost with an empty value', async () => {
    const { user, actions } = await openDetails({
      viewer: dm,
      handOf: ayla,
      holding: { costOverride: '1' },
    })
    const field = details().getByRole('textbox', { name: /Bu eldeki cost/ })
    expect(field).toHaveValue('1')

    await user.clear(field)
    await user.tab()

    expect(actions.setCost).toHaveBeenCalledExactlyOnceWith('h1', '')
  })

  it('shows a Turkish error when a note cannot be saved', async () => {
    const actions = fakeActions()
    actions.setNote.mockRejectedValue(Object.assign(new Error('x'), { code: 'permission-denied' }))
    const { user } = await openDetails({ actions })

    await user.type(details().getByRole('textbox', { name: 'Kart notu' }), 'Not')
    await user.tab()

    expect(await details().findByRole('alert')).toHaveTextContent('Bu işlem için yetkin yok.')
  })
})

describe('HoldingDialog actions', () => {
  it('uses the card on a character after confirming, then closes', async () => {
    const { user, actions } = await openDetails()

    await user.click(details().getByRole('button', { name: 'Kullan' }))
    await user.type(details().getByRole('textbox', { name: /Hangi karakter üzerinde/ }), 'Thorin')
    await user.click(details().getByRole('button', { name: 'Kullanımı onayla' }))

    expect(actions.closeHolding).toHaveBeenCalledExactlyOnceWith({
      holdingId: 'h1',
      by: testUser.uid,
      reason: 'used',
      usedOn: 'Thorin',
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cancels using the card', async () => {
    const { user, actions } = await openDetails()

    await user.click(details().getByRole('button', { name: 'Kullan' }))
    await user.click(details().getByRole('button', { name: 'Vazgeç' }))

    expect(actions.closeHolding).not.toHaveBeenCalled()
    expect(details().getByRole('button', { name: 'Kullan' })).toBeInTheDocument()
  })

  it('lets the DM switch a card active and inactive', async () => {
    const { user, actions } = await openDetails({ viewer: dm, handOf: ayla })
    await user.click(details().getByRole('button', { name: '● Aktif et' }))
    expect(actions.setActive).toHaveBeenCalledExactlyOnceWith('h1', true)
  })

  it('offers the DM to switch an active card off', async () => {
    const { user, actions } = await openDetails({
      viewer: dm,
      handOf: ayla,
      holding: { active: true },
    })
    await user.click(details().getByRole('button', { name: '✓ Aktifliği kaldır' }))
    expect(actions.setActive).toHaveBeenCalledExactlyOnceWith('h1', false)
  })

  it('lets the DM discard a card after confirming, and cancel', async () => {
    const { user, actions } = await openDetails({ viewer: dm, handOf: ayla })

    await user.click(details().getByRole('button', { name: 'At' }))
    expect(
      details().getByText(/kullanılmadan elden atılsın mı\? Kart havuza döner\./),
    ).toBeVisible()
    await user.click(details().getByRole('button', { name: 'Vazgeç' }))
    expect(actions.closeHolding).not.toHaveBeenCalled()

    await user.click(details().getByRole('button', { name: 'At' }))
    await user.click(details().getByRole('button', { name: 'Evet, at' }))

    expect(actions.closeHolding).toHaveBeenCalledExactlyOnceWith({
      holdingId: 'h1',
      by: testUser.uid,
      reason: 'discarded',
    })
  })

  it('lets the DM give the card to another player after choosing and confirming', async () => {
    const { user, actions } = await openDetails({ viewer: dm, handOf: ayla })

    await user.click(details().getByRole('button', { name: 'Başkasına ver' }))
    const picker = details().getByRole('combobox', { name: 'Kime verilsin?' })
    expect(
      within(picker)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Oyuncu seç', 'Gökay', 'Bora'])
    const confirm = details().getByRole('button', { name: 'Onayla ve ver' })
    expect(confirm).toBeDisabled()

    await user.selectOptions(picker, 'Bora')
    await user.click(confirm)

    expect(actions.transferHolding).toHaveBeenCalledExactlyOnceWith({
      holdingId: 'h1',
      toUid: 'bora',
      by: testUser.uid,
    })
  })

  it('cancels giving the card to another player', async () => {
    const { user, actions } = await openDetails({ viewer: dm, handOf: ayla })

    await user.click(details().getByRole('button', { name: 'Başkasına ver' }))
    await user.click(details().getByRole('button', { name: 'Vazgeç' }))

    expect(actions.transferHolding).not.toHaveBeenCalled()
    expect(details().getByRole('button', { name: 'Başkasına ver' })).toBeInTheDocument()
  })

  it('says so when the card was already closed elsewhere, and stays open', async () => {
    const actions = fakeActions()
    actions.closeHolding.mockRejectedValue(new HoldingError('closed'))
    const { user } = await openDetails({ actions })

    await user.click(details().getByRole('button', { name: 'Kullan' }))
    await user.click(details().getByRole('button', { name: 'Kullanımı onayla' }))

    expect(details().getByRole('alert')).toHaveTextContent(
      'Bu kart artık bu elde değil: başka bir cihazda kullanılmış ya da verilmiş olabilir.',
    )
    expect(details().getByRole('button', { name: 'Kullanımı onayla' })).toBeEnabled()
  })

  it('says so when the rules deny an action', async () => {
    const actions = fakeActions()
    actions.transferHolding.mockRejectedValue(
      Object.assign(new Error('denied'), { code: 'permission-denied' }),
    )
    const { user } = await openDetails({ viewer: dm, handOf: ayla, actions })

    await user.click(details().getByRole('button', { name: 'Başkasına ver' }))
    await user.selectOptions(details().getByRole('combobox'), 'Bora')
    await user.click(details().getByRole('button', { name: 'Onayla ve ver' }))

    expect(details().getByRole('alert')).toHaveTextContent('Bu işlem için yetkin yok.')
  })

  it('does not try a card movement offline, and says that a connection is needed', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { user, actions } = await openDetails({ card: testCursedCard('Night Owl') })

    await user.click(details().getByRole('button', { name: 'Kullan' }))
    await user.click(details().getByRole('button', { name: 'Kullanımı onayla' }))

    expect(actions.closeHolding).not.toHaveBeenCalled()
    expect(details().getByRole('alert')).toHaveTextContent(
      'Bağlantı yok: kart hareketleri için internet bağlantısı gerekiyor.',
    )
  })
})
