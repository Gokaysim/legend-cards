import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { describe, expect, it, vi } from 'vitest'

import type { BalanceActions } from '@/features/balances/balancesContext'
import { testCard, testCursedCard } from '@/test/cardFixtures'
import { testCharacter, testEffect } from '@/test/characterFixtures'

import { ready, testProfile, testUser } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { renderApp } from '@/test/renderApp'

const me = testProfile()
const ayla = testProfile({ id: 'ayla', displayName: 'Ayla' })
const bora = testProfile({ id: 'bora', displayName: 'Bora' })
const dmProfile = testProfile({ role: 'dm' })

const BUSY = 'Bir Pack açık: seçim bekleniyor.'

const heading = () => screen.getByRole('heading', { level: 1 })
/** The heading of the hand's panel, which names whose hand it is. */
const handHeading = () => main().getByRole('heading', { level: 2, name: /— Kart Eli$/ })
/** The screen itself, without the sidebar (its "Oyuncular" list has its own loading and error states). */
const main = () => within(screen.getByRole('main'))

describe('the "Oyuncu elleri" entry', () => {
  it("opens a player's own hand, titled with their name", () => {
    const { router } = renderApp({
      path: '/hands',
      users: { profiles: ready([ayla, bora, me]) },
    })

    expect(router.state.location.pathname).toBe(`/hands/${testUser.uid}`)
    expect(heading()).toHaveTextContent('Oyuncu elleri')
    expect(handHeading()).toHaveTextContent('Gökay — Kart Eli')
  })

  it('opens the DM on the first player of the list who is not the DM', () => {
    const { router } = renderApp({
      path: '/hands',
      users: { currentProfile: ready(dmProfile), profiles: ready([ayla, bora, dmProfile]) },
    })

    expect(router.state.location.pathname).toBe('/hands/ayla')
    expect(heading()).toHaveTextContent('Oyuncu elleri')
    expect(handHeading()).toHaveTextContent('Ayla — Kart Eli')
  })

  it("opens the DM's own hand when there is no other player", () => {
    const { router } = renderApp({
      path: '/hands',
      users: { currentProfile: ready(dmProfile), profiles: ready([dmProfile]) },
    })

    expect(router.state.location.pathname).toBe(`/hands/${testUser.uid}`)
  })

  it('replaces the menu URL, so going back does not return to it', () => {
    const { router } = renderApp({ path: '/hands' })

    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('waits for the profiles before choosing a hand', () => {
    const { router, setUsers } = renderApp({
      path: '/hands',
      users: { currentProfile: ready(dmProfile), profiles: { status: 'loading' } },
    })
    expect(main().getByRole('status')).toHaveTextContent('El açılıyor…')
    expect(router.state.location.pathname).toBe('/hands')

    setUsers({ currentProfile: ready(dmProfile), profiles: ready([bora, dmProfile]) })

    expect(router.state.location.pathname).toBe('/hands/bora')
  })
})

describe('a hand URL', () => {
  it('shows that hand directly, as after a reload', () => {
    renderApp({ path: '/hands/bora', users: { profiles: ready([me, bora]) } })

    expect(heading()).toHaveTextContent('Oyuncu elleri')
    expect(handHeading()).toHaveTextContent('Bora — Kart Eli')
  })

  it('says in Turkish when the user ID has no profile', () => {
    renderApp({ path: '/hands/nobody', users: { profiles: ready([me]) } })

    expect(heading()).toHaveTextContent('Oyuncu elleri')
    expect(screen.getByText('Böyle bir oyuncu yok.')).toBeInTheDocument()
  })

  it('waits while the own profile is being created', () => {
    renderApp({
      path: `/hands/${testUser.uid}`,
      users: { currentProfile: ready(null), profiles: ready([]) },
    })

    expect(main().getByRole('status')).toHaveTextContent('Profil hazırlanıyor…')
  })

  it('says so when the profiles cannot be read', () => {
    renderApp({
      path: '/hands/bora',
      users: {
        profiles: { status: 'error', error: { kind: 'unknown', message: 'x', path: 'users' } },
      },
    })

    expect(main().getByRole('alert')).toHaveTextContent('Oyuncular yüklenemedi.')
  })
})

describe('Legend Points on the hand', () => {
  const aylaWithLp = { ...ayla, lp: 7 }
  /** The value of a stat in the hand summary, by its label. */
  const stat = (label: string) =>
    within(screen.getByLabelText('El özeti')).getByText(label).nextElementSibling?.textContent

  it("shows a player's LP as the first stat", () => {
    renderApp({ path: '/hands/ayla', users: { profiles: ready([aylaWithLp, me]) } })

    expect(stat('Legend Point')).toBe('7')
    const labels = within(screen.getByLabelText('El özeti'))
      .getAllByRole('term')
      .map((term) => term.textContent)
    expect(labels[0]).toBe('Legend Point')
  })

  it('offers players no LP change, not even on their own hand', () => {
    renderApp({ path: `/hands/${testUser.uid}`, users: { profiles: ready([ayla, me]) } })
    expect(main().queryByRole('button', { name: /LP'sini değiştir/ })).not.toBeInTheDocument()
  })

  it("lets the DM change a player's LP from the hand", async () => {
    const user = userEvent.setup()
    const changeBalance = vi.fn<BalanceActions['changeBalance']>(() => Promise.resolve('e1'))
    renderApp({
      path: '/hands/ayla',
      users: { currentProfile: ready(dmProfile), profiles: ready([aylaWithLp, dmProfile]) },
      balances: { actions: { changeBalance } },
    })

    await user.click(main().getByRole('button', { name: "Ayla'nın LP'sini değiştir" }))
    const dialog = within(screen.getByRole('dialog', { name: 'Legend Point: Ayla' }))
    await user.type(dialog.getByRole('spinbutton', { name: 'Miktar' }), '2')
    await user.type(dialog.getByRole('textbox', { name: 'Neden' }), "Boss'u yendi")
    await user.click(dialog.getByRole('button', { name: '+ Ekle' }))

    expect(changeBalance).toHaveBeenCalledExactlyOnceWith({
      account: { currency: 'lp', uid: 'ayla' },
      delta: 2,
      reason: "Boss'u yendi",
      by: testUser.uid,
    })
  })

  it('shows the new LP live', () => {
    const { setUsers } = renderApp({
      path: '/hands/ayla',
      users: { profiles: ready([aylaWithLp, me]) },
    })
    setUsers({ profiles: ready([{ ...aylaWithLp, lp: 9 }, me]) })
    expect(stat('Legend Point')).toBe('9')
  })

  it("shows no LP on the DM's own hand", () => {
    renderApp({
      path: `/hands/${testUser.uid}`,
      users: { currentProfile: ready(dmProfile), profiles: ready([dmProfile]) },
    })
    expect(
      within(screen.getByLabelText('El özeti')).queryByText('Legend Point'),
    ).not.toBeInTheDocument()
  })
})

describe('character effects in the hand summary', () => {
  const stat = (label: string) =>
    within(screen.getByLabelText('El özeti')).getByText(label).nextElementSibling?.textContent

  it("counts and lists the stored effects of the player's active characters, not an archived one's", () => {
    const owl = testCard('Night Owl')
    const thorin = testCharacter('Thorin', 'ayla', { addedAtMillis: 1000 })
    const kuzgun = testCharacter('Kuzgun', 'ayla', { addedAtMillis: 2000, archived: true })
    renderApp({
      path: '/hands/ayla',
      users: { profiles: ready([ayla, me]) },
      cards: { cards: ready([owl]) },
      holdings: { openHoldings: ready([testHolding(owl, 'ayla', 1000, { active: true })]) },
      characters: {
        characters: ready([thorin, kuzgun]),
        effects: ready([
          testEffect('Kutsal su', thorin, { addedAtMillis: 3000 }),
          testEffect('Kutsanmış kalkan', thorin, { addedAtMillis: 4000, source: 'dm' }),
          testEffect('Unutulmuş', kuzgun),
        ]),
      },
    })

    expect(stat('Aktif efekt')).toBe('3')
    const list = within(screen.getByRole('region', { name: 'Aktif Efektler' }))
    expect(list.getByText('Night Owl')).toBeInTheDocument()
    expect(list.getByText('Thorin')).toBeInTheDocument()
    expect(list.getByText('Kutsanmış kalkan')).toBeInTheDocument()
    expect(list.getByText('Kutsal su')).toBeInTheDocument()
    expect(list.queryByText('Unutulmuş')).not.toBeInTheDocument()
    expect(list.queryByText('Kuzgun')).not.toBeInTheDocument()
  })
})

describe('the "🎁 Pack Shop" link', () => {
  it('opens the Pack Shop from a hand', async () => {
    const user = userEvent.setup()
    const { router } = renderApp({
      path: `/hands/${testUser.uid}`,
      users: { profiles: ready([me]) },
    })

    await user.click(main().getByRole('link', { name: '🎁 Pack Shop' }))

    expect(router.state.location.pathname).toBe('/shops/packs')
    expect(router.state.location.search).toBe('')
    expect(heading()).toHaveTextContent('Pack Shop')
  })

  it("opens the DM's Pack Shop for the hand being viewed", async () => {
    const user = userEvent.setup()
    const { router } = renderApp({
      path: '/hands/bora',
      users: { currentProfile: ready(dmProfile), profiles: ready([bora, dmProfile]) },
    })

    await user.click(main().getByRole('link', { name: '🎁 Pack Shop' }))

    expect(router.state.location.search).toBe('?for=bora')
  })
})

describe('drawing on the hand', () => {
  const eyes = testCard("Aboleth's Eyes")
  const rite = testCard('Blood Rite')
  const visions = testCursedCard('Visions of Death')
  const meWithLp = { ...me, lp: 3 }
  const drawButtons = () => [
    main().queryByRole('button', { name: '🎲 Kart Çek' }),
    main().queryByRole('button', { name: '☠ Cursed Kart Çek' }),
  ]

  it("shows both draw buttons on a player's own hand", () => {
    renderApp({
      path: `/hands/${testUser.uid}`,
      users: { profiles: ready([meWithLp, ayla]) },
      cards: { cards: ready([eyes, visions]) },
    })

    expect(drawButtons()).toEqual([expect.anything(), expect.anything()])
  })

  it("shows the DM both draw buttons on a player's hand", () => {
    renderApp({
      path: '/hands/bora',
      users: { currentProfile: ready(dmProfile), profiles: ready([bora, dmProfile]) },
      cards: { cards: ready([eyes, visions]) },
    })

    expect(drawButtons()).toEqual([expect.anything(), expect.anything()])
  })

  it("shows another player's hand without draw buttons", () => {
    renderApp({
      path: '/hands/bora',
      users: { profiles: ready([meWithLp, bora]) },
      cards: { cards: ready([eyes, visions]) },
    })

    expect(drawButtons()).toEqual([null, null])
  })

  it('disables the Cursed draw while the Cursed Deck is empty', () => {
    renderApp({
      path: `/hands/${testUser.uid}`,
      users: { profiles: ready([meWithLp]) },
      cards: { cards: ready([eyes, testCursedCard('Old Curse', { status: 'retired' })]) },
    })

    expect(main().getByRole('button', { name: '☠ Cursed Kart Çek' })).toBeDisabled()
    expect(main().getByRole('button', { name: '🎲 Kart Çek' })).toBeEnabled()
  })

  it('disables both draws and "+ Kart ver" while a pack is open, and says why', () => {
    renderApp({
      path: '/hands/bora',
      users: { currentProfile: ready(dmProfile), profiles: ready([bora, dmProfile]) },
      cards: { cards: ready([eyes, visions]) },
      table: { openPackId: 'pack-1' },
    })

    for (const button of drawButtons()) expect(button).toBeDisabled()
    expect(main().getByRole('button', { name: '+ Kart ver' })).toBeDisabled()
    expect(main().getByRole('button', { name: "Bora'nın LP'sini değiştir" })).toBeDisabled()
    expect(main().getByText(BUSY)).toBeInTheDocument()
  })

  it('enables them again when the pack ends', () => {
    const { setTable } = renderApp({
      path: `/hands/${testUser.uid}`,
      users: { profiles: ready([meWithLp]) },
      cards: { cards: ready([eyes, visions]) },
      table: { openPackId: 'pack-1' },
    })
    setTable({ openPackId: null })

    for (const button of drawButtons()) expect(button).toBeEnabled()
    expect(main().queryByText(BUSY)).not.toBeInTheDocument()
  })

  it('shows a drawn card at the end of the hand once the holding arrives', async () => {
    const user = userEvent.setup()
    const first = testHolding(eyes, testUser.uid, 1000)
    const heldEyes = testCard("Aboleth's Eyes", {
      holder: { uid: testUser.uid, userCardId: first.id },
    })
    const { setHoldings, setUsers } = renderApp({
      path: `/hands/${testUser.uid}`,
      users: { profiles: ready([meWithLp]) },
      cards: { cards: ready([heldEyes, rite, visions]) },
      holdings: { openHoldings: ready([first]) },
    })

    await user.click(main().getByRole('button', { name: '🎲 Kart Çek' }))
    await user.click(screen.getByRole('button', { name: '🎲 Kart Çek (1 LP)' }))
    expect(screen.getByRole('button', { name: 'Kart 1: çevir' })).toBeInTheDocument()

    // The draw's holding and the new LP arrive through the subscriptions.
    setHoldings({
      openHoldings: ready([
        first,
        testHolding(rite, testUser.uid, 2000, {
          givenBy: testUser.uid,
          givenVia: 'draw',
          drawId: 'draw-legend-bloodrite',
        }),
      ]),
    })
    setUsers({ profiles: ready([{ ...meWithLp, lp: 2 }]) })

    const hand = within(screen.getByRole('list', { name: 'Eldeki kartlar' }))
    expect(hand.getAllByRole('article').map((card) => card.getAttribute('aria-label'))).toEqual([
      "Aboleth's Eyes",
      'Blood Rite',
    ])
    expect(screen.getByText(/Bakiye:/)).toHaveTextContent('Bakiye: 2 LP')
  })
})

describe('the notes on the hand', () => {
  const note = (text: string) => ({
    text,
    updatedBy: 'ayla',
    updatedAt: Timestamp.fromMillis(1000),
  })
  const tabs = () => main().getAllByRole('tab')
  const asDm = { currentProfile: ready(dmProfile), profiles: ready([ayla, bora, dmProfile]) }

  it('shows the player note under the cards and under the True Words', async () => {
    const user = userEvent.setup()
    renderApp({
      path: '/hands/ayla',
      users: { profiles: ready([me, ayla]) },
      notes: { playerNotes: { ayla: ready(note('Kayıp kardeşini arıyor.')) } },
    })

    expect(main().getByRole('region', { name: 'Oyuncu notu' })).toHaveTextContent(
      'Kayıp kardeşini arıyor.',
    )

    await user.click(main().getByRole('tab', { name: '✦ True Words' }))
    expect(main().getByRole('region', { name: 'Oyuncu notu' })).toHaveTextContent(
      'Kayıp kardeşini arıyor.',
    )
  })

  it('gives a player the Kartlar, True Words and Karakterler tabs only, and never reads a DM note', () => {
    const onUseDmNote = vi.fn()
    renderApp({
      path: '/hands/ayla',
      users: { profiles: ready([me, ayla]) },
      notes: { onUseDmNote },
    })

    expect(tabs().map((tab) => tab.textContent)).toEqual([
      '♠ Kartlar',
      '✦ True Words',
      '🧝 Karakterler',
    ])
    expect(onUseDmNote).not.toHaveBeenCalled()
  })

  it('gives the DM a fourth tab, "🔒 DM notu", after Karakterler, kept in the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderApp({
      path: '/hands/ayla',
      users: asDm,
      notes: { dmNotes: { ayla: ready(note('Kardeşi aslında hayatta.')) } },
    })

    expect(tabs().map((tab) => tab.textContent)).toEqual([
      '♠ Kartlar',
      '✦ True Words',
      '🧝 Karakterler',
      '🔒 DM notu',
    ])

    await user.click(main().getByRole('tab', { name: '🔒 DM notu' }))

    expect(router.state.location.search).toBe('?tab=dm-note')
    expect(main().getByRole('tab', { name: '🔒 DM notu' })).toHaveAttribute('aria-selected', 'true')
    expect(main().getByRole('textbox', { name: 'Ayla — DM notu' })).toHaveValue(
      'Kardeşi aslında hayatta.',
    )
    expect(main().getByRole('region', { name: 'Oyuncu notu' })).toBeInTheDocument()

    await user.click(main().getByRole('tab', { name: '♠ Kartlar' }))
    expect(router.state.location.search).toBe('')
  })

  it('opens the DM notu tab again from its URL, as after a reload', () => {
    renderApp({ path: '/hands/bora?tab=dm-note', users: asDm })

    expect(main().getByRole('tab', { name: '🔒 DM notu' })).toHaveAttribute('aria-selected', 'true')
    expect(main().getByRole('textbox', { name: 'Bora — DM notu' })).toBeInTheDocument()
  })

  it("opens the Kartlar tab for a player who opens the DM notu tab's URL", () => {
    const onUseDmNote = vi.fn()
    renderApp({
      path: `/hands/${testUser.uid}?tab=dm-note`,
      users: { profiles: ready([me]) },
      notes: { onUseDmNote },
    })

    expect(main().getByRole('tab', { name: '♠ Kartlar' })).toHaveAttribute('aria-selected', 'true')
    expect(main().queryByRole('tab', { name: '🔒 DM notu' })).not.toBeInTheDocument()
    expect(onUseDmNote).not.toHaveBeenCalled()
  })

  it.each([
    ['a player', { profiles: ready([me, ayla]) }],
    ['the DM', asDm],
  ])('opens the Kartlar tab for %s from a link to the former Notlar tab', (_case, users) => {
    renderApp({
      path: '/hands/ayla?tab=notes',
      users,
      notes: { playerNotes: { ayla: ready(note('Kayıp kardeşini arıyor.')) } },
    })

    expect(main().getByRole('tab', { name: '♠ Kartlar' })).toHaveAttribute('aria-selected', 'true')
    expect(main().getByRole('region', { name: 'Oyuncu notu' })).toHaveTextContent(
      'Kayıp kardeşini arıyor.',
    )
  })

  it('marks no tab, whether the player note or the DM note has text', () => {
    renderApp({
      path: '/hands/ayla',
      users: asDm,
      notes: {
        playerNotes: { ayla: ready(note('Kayıp kardeşini arıyor.')) },
        dmNotes: { ayla: ready(note('Gizli plan.')) },
      },
    })

    expect(tabs().map((tab) => tab.textContent)).toEqual([
      '♠ Kartlar',
      '✦ True Words',
      '🧝 Karakterler',
      '🔒 DM notu',
    ])
  })
})
