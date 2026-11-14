import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Card } from '@/features/cards/schema'
import type { Character } from '@/features/characters/schema'
import { testPicturePath } from '@/test/artFixtures'
import { testCard, testCursedCard } from '@/test/cardFixtures'
import { testCharacter } from '@/test/characterFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { stubWideWindow } from '@/test/media'
import { renderApp } from '@/test/renderApp'

import { HoldingError } from './errors'
import type { HoldingActions } from './holdingsContext'
import type { Holding } from './schema'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** The signed-in player, with 5 LP to pay for their own uses. */
const me = testProfile({ lp: 5 })
const dm = testProfile({ role: 'dm' })
const ayla = testProfile({ id: 'ayla', displayName: 'Ayla', lp: 4 })
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
  characters = [],
}: {
  viewer?: typeof me
  handOf?: typeof me
  holding?: Partial<Holding>
  card?: Card
  actions?: ReturnType<typeof fakeActions>
  /** An open pack, which makes the table wait. */
  openPackId?: string | null
  /** The table's characters. */
  characters?: Character[]
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
    characters: { characters: ready(characters) },
  })
  await user.click(screen.getByRole('button', { name: `${card.name}: ayrıntılar` }))
  return { user, actions, held, ...view }
}

/** Where a card's details show: one body in two hosts (design D3). Every case below runs in both. */
type Host = {
  name: string
  /** Sets the window up for this host. */
  setup: () => void
  /** The box that holds the details. */
  container: () => HTMLElement
  /** No card's details show: no dialog, or the panel's empty text. */
  isClosed: () => boolean
}

const EMPTY_PANEL = 'Bir kart seç'
const HOSTS: Host[] = [
  {
    name: 'the dialog',
    setup: () => undefined,
    container: () => screen.getByRole('dialog', { name: 'Night Owl' }),
    isClosed: () => screen.queryByRole('dialog') === null,
  },
  {
    name: 'the panel beside the hand',
    setup: stubWideWindow,
    container: () => screen.getByRole('region', { name: 'Seçili Kart' }),
    isClosed: () =>
      screen.queryByRole('dialog') === null &&
      within(screen.getByRole('region', { name: 'Seçili Kart' })).queryByText(EMPTY_PANEL) !== null,
  },
]
let host: Host = HOSTS[0]!

const details = () => within(host.container())
const button = (name: string) => details().queryByRole('button', { name })

describe.each(HOSTS)('the card details in $name', (current) => {
  beforeEach(() => {
    host = current
    current.setup()
  })

  describe('HoldingDialog controls', () => {
    it('shows the holder their note and "Kullan", without the DM controls', async () => {
      await openDetails()

      expect(details().getByRole('article', { name: 'Night Owl' })).toBeInTheDocument()
      expect(details().getByText("Gökay'ın elinde")).toBeInTheDocument()
      expect(details().getByRole('textbox', { name: 'Kart notu' })).toBeInTheDocument()
      expect(button('Kullan')).toBeInTheDocument()
      expect(details().queryByRole('textbox', { name: /Bu eldeki cost/ })).not.toBeInTheDocument()
      for (const name of ['Aktif et', 'Başkasına ver', 'At']) expect(button(name)).toBeNull()
      expect(details().queryByRole('region', { name: 'DM araçları' })).not.toBeInTheDocument()
    })

    it("shows another player's card read-only, with no actions", async () => {
      await openDetails({ handOf: ayla, holding: { note: 'Boss savaşında kullan' } })

      expect(details().getByText("Ayla'nın elinde")).toBeInTheDocument()
      expect(details().getByText('Boss savaşında kullan')).toBeInTheDocument()
      expect(
        details().getByText('Boss savaşında kullan').closest('[data-note-paper]'),
      ).not.toBeNull()
      expect(details().queryByRole('textbox')).not.toBeInTheDocument()
      for (const name of ['Kullan', 'Aktif et', 'Başkasına ver', 'At'])
        expect(button(name)).toBeNull()
      expect(details().queryByRole('region', { name: 'DM araçları' })).not.toBeInTheDocument()
    })

    it('says "Not yok." on the note paper of a card without a note, to another player', async () => {
      await openDetails({ handOf: ayla })

      expect(details().getByText('Not yok.').closest('[data-note-paper]')).not.toBeNull()
    })

    it('shows the DM every control on any hand', async () => {
      await openDetails({ viewer: dm, handOf: ayla })

      expect(details().getByRole('textbox', { name: 'Kart notu' })).toBeInTheDocument()
      expect(button('Kullan')).toBeInTheDocument()
      const tools = within(details().getByRole('region', { name: 'DM araçları' }))
      const cost = tools.getByRole('textbox', { name: 'Bu eldeki cost' })
      expect(cost).toHaveAccessibleDescription('temel: 3')
      expect(cost).toHaveAttribute('placeholder', '3')
      for (const name of ['Aktif et', 'Başkasına ver', 'At']) {
        expect(tools.getByRole('button', { name })).toBeInTheDocument()
      }
      expect(tools.queryByRole('button', { name: 'Kullan' })).not.toBeInTheDocument()
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

      // At the top of the details: by the panel's label beside the hand, above the face in the dialog.
      const badges = within(host.container()).getByRole('list', { name: 'Durum' })
      expect(within(badges).getByText('Ek kopya')).toBeInTheDocument()
      expect(details().getByText("Gökay'ın elinde")).toBeInTheDocument()
    })

    it('marks an active card with the "Aktif" badge, and not again under its face', async () => {
      await openDetails({ holding: { active: true } })

      const badges = within(host.container()).getByRole('list', { name: 'Durum' })
      expect(within(badges).getByText('Aktif')).toBeInTheDocument()
      expect(details().getByRole('article', { name: 'Night Owl' })).not.toHaveTextContent('Aktif')
    })

    const infoLabels = () =>
      within(details().getByRole('list', { name: 'Kart bilgileri' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent)

    it("labels the card's set, rarity, cost and mechanic pack, and writes its text only on its face", async () => {
      await openDetails({
        card: testCard('Night Owl', {
          cost: '3',
          setCode: 'Kesqer',
          rarity: 'rare',
          mechanicPack: 'Blood & Battle',
          text: 'Gain 1 LP.',
        }),
      })

      expect(infoLabels()).toEqual(['Kesqerian Nights', 'Rare', 'Cost 3', 'Blood & Battle'])
      // Without a picture, the face writes the text; nothing under it writes it again.
      expect(details().getAllByText('Gain 1 LP.')).toHaveLength(1)
      expect(details().getByRole('article', { name: 'Night Owl' })).toHaveTextContent('Gain 1 LP.')
    })

    it('labels a Cursed card only "Cursed" and its cost', async () => {
      const curse = testCursedCard('Night Owl', { cost: '1', text: 'Lose 1 LP.' })
      await openDetails({ card: curse })

      expect(infoLabels()).toEqual(['Cursed', 'Cost 1'])
    })

    it("labels a changed cost with the card's own cost", async () => {
      await openDetails({ holding: { costOverride: '1' } })

      expect(infoLabels()).toContain('Cost 1 (temel: 3)')
    })

    it("does not write the card's name and text under its picture, and names the details for screen readers", async () => {
      const pictured = testCard('Night Owl', {
        cost: '3',
        text: 'Gain 1 LP.',
        picture: testPicturePath('card', 'legend-nightowl'),
      })
      await openDetails({ card: pictured })

      const face = details().getByRole('article', { name: 'Night Owl' })
      expect(within(face).getByRole('img', { name: 'Night Owl' })).toBeInTheDocument()
      // The text and the name are in the DOM only for screen readers; the dialog's own title stays visible.
      expect(details().getByText('Gain 1 LP.')).toHaveClass('sr-only')
      const visibleNames = details()
        .queryAllByText('Night Owl')
        .filter((element) => !element.classList.contains('sr-only'))
        .filter((element) => !(element.tagName === 'H2' && element.closest('dialog') !== null))
      expect(visibleNames).toEqual([])
      expect(
        details().getAllByRole('heading', { name: 'Night Owl' }).length,
      ).toBeGreaterThanOrEqual(1)
    })

    it('lays the face above the rest, and in the dialog at its left from 640 px', async () => {
      await openDetails()

      const face = host.container().querySelector('[data-details-face]')
      const row = face?.parentElement
      if (current === HOSTS[0]) {
        // A phone stacks the face above the labels; from `sm` it stands at their left, 240 px wide.
        expect(face).toHaveClass('max-w-72', 'sm:w-60')
        expect(row).toHaveClass('flex-col', 'sm:flex-row')
      } else {
        expect(face).toHaveClass('max-w-66')
        expect(row).toHaveClass('flex-col')
        expect(row).not.toHaveClass('sm:flex-row')
      }
      // The labels, the note and "Kullan" come after the face.
      expect(face?.nextElementSibling).toContainElement(
        details().getByRole('list', { name: 'Kart bilgileri' }),
      )
      expect(face?.nextElementSibling).toContainElement(button('Kullan'))
    })

    it.runIf(current === HOSTS[0])('closes with the close button', async () => {
      const { user } = await openDetails()

      await user.click(details().getByRole('button', { name: '✕ Kapat' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('closes when the card leaves the hand, for example on another device', async () => {
      const { setHoldings } = await openDetails()

      setHoldings({ openHoldings: ready([]) })

      expect(host.isClosed()).toBe(true)
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
      const { user } = await openDetails({
        viewer: dm,
        handOf: ayla,
        actions,
        openPackId: 'pack-1',
      })

      await user.click(details().getByRole('button', { name: 'Aktif et' }))
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
      actions.setNote.mockRejectedValue(
        Object.assign(new Error('x'), { code: 'permission-denied' }),
      )
      const { user } = await openDetails({ actions })

      await user.type(details().getByRole('textbox', { name: 'Kart notu' }), 'Not')
      await user.tab()

      expect(await details().findByRole('alert')).toHaveTextContent('Bu işlem için yetkin yok.')
    })
  })

  describe('HoldingDialog actions', () => {
    it('uses the card on a character after confirming its price, then closes', async () => {
      const thorin = testCharacter('Thorin', me.id)
      const { user, actions } = await openDetails({ characters: [thorin] })

      await user.click(details().getByRole('button', { name: 'Kullan' }))
      expect(details().getByText('3 LP')).toBeInTheDocument()
      expect(details().getByText('5 LP → 2 LP')).toBeInTheDocument()
      await user.selectOptions(
        details().getByRole('combobox', { name: 'Hangi karakter üzerinde?' }),
        'Thorin',
      )
      await user.click(details().getByRole('button', { name: 'Kullanımı onayla (3 LP)' }))

      expect(actions.closeHolding).toHaveBeenCalledExactlyOnceWith({
        holdingId: 'h1',
        by: testUser.uid,
        reason: 'used',
        target: { kind: 'character', characterId: thorin.id },
        amount: 3,
      })
      expect(host.isClosed()).toBe(true)
    })

    it('does not let a player use a card that costs more than their LP, and says why', async () => {
      const poor = testProfile({ lp: 1 })
      const { user, actions } = await openDetails({ viewer: poor, handOf: poor })

      await user.click(details().getByRole('button', { name: 'Kullan' }))

      expect(details().getByRole('button', { name: 'Kullanımı onayla (3 LP)' })).toBeDisabled()
      expect(
        details().getByText("Bu kullanım 3 LP tutuyor; Gökay'ın 1 LP'si var."),
      ).toBeInTheDocument()
      expect(actions.closeHolding).not.toHaveBeenCalled()
    })

    it("lets the DM use a player's card for the amount the DM enters", async () => {
      const { user, actions } = await openDetails({ viewer: dm, handOf: ayla })

      await user.click(details().getByRole('button', { name: 'Kullan' }))
      const amount = details().getByRole('spinbutton', { name: "Tutar (Ayla'nın LP'sinden)" })
      expect(amount).toHaveValue(3)
      await user.clear(amount)
      await user.type(amount, '0')
      await user.click(details().getByRole('button', { name: 'Kullanımı onayla' }))

      expect(actions.closeHolding).toHaveBeenCalledExactlyOnceWith({
        holdingId: 'h1',
        by: testUser.uid,
        reason: 'used',
        target: { kind: 'none' },
        amount: 0,
      })
    })

    it('shows a cost the DM changes on another device while the use step is open', async () => {
      const { user, actions, setHoldings, held } = await openDetails()
      await user.click(details().getByRole('button', { name: 'Kullan' }))

      setHoldings({ openHoldings: ready([{ ...held, costOverride: '1' }]), actions })

      expect(details().getByText('5 LP → 4 LP')).toBeInTheDocument()
      expect(details().getByRole('button', { name: 'Kullanımı onayla (1 LP)' })).toBeEnabled()
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
      await user.click(details().getByRole('button', { name: 'Aktif et' }))
      expect(actions.setActive).toHaveBeenCalledExactlyOnceWith('h1', true)
    })

    it('offers the DM to switch an active card off', async () => {
      const { user, actions } = await openDetails({
        viewer: dm,
        handOf: ayla,
        holding: { active: true },
      })
      await user.click(details().getByRole('button', { name: 'Aktifliği kaldır' }))
      expect(actions.setActive).toHaveBeenCalledExactlyOnceWith('h1', false)
    })

    it('lets the DM discard a card after confirming, and cancel', async () => {
      const { user, actions } = await openDetails({ viewer: dm, handOf: ayla })

      await user.click(details().getByRole('button', { name: 'At' }))
      // The question opens in place of the buttons, inside the DM's tools.
      const tools = within(details().getByRole('region', { name: 'DM araçları' }))
      expect(tools.getByText(/kullanılmadan elden atılsın mı\? Kart havuza döner\./)).toBeVisible()
      for (const name of ['Kullan', 'Aktif et', 'Başkasına ver', 'At'])
        expect(button(name)).toBeNull()
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
      await user.click(details().getByRole('button', { name: 'Kullanımı onayla (3 LP)' }))

      expect(details().getByRole('alert')).toHaveTextContent(
        'Bu kart artık bu elde değil: başka bir cihazda kullanılmış ya da verilmiş olabilir.',
      )
      expect(details().getByRole('button', { name: 'Kullanımı onayla (3 LP)' })).toBeEnabled()
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
      await user.click(details().getByRole('button', { name: 'Kullanımı onayla (1 LP)' }))

      expect(actions.closeHolding).not.toHaveBeenCalled()
      expect(details().getByRole('alert')).toHaveTextContent(
        'Bağlantı yok: kart hareketleri için internet bağlantısı gerekiyor.',
      )
    })
  })

  describe('HoldingDialog character of a use', () => {
    const thorin = testCharacter('Thorin', 'ayla', { addedAtMillis: 1000 })
    const kuzgun = testCharacter('Kuzgun', 'ayla', { addedAtMillis: 2000 })
    const old = testCharacter('Old', 'ayla', { archived: true })
    const elara = testCharacter('Elara', 'bora')
    const CHARACTERS = [thorin, kuzgun, old, elara]

    const picker = () => details().getByRole('combobox', { name: 'Hangi karakter üzerinde?' })
    /** The list as shown: each group's label with its characters, and the choices outside groups. */
    const listed = () =>
      Array.from(picker().children).map((child) =>
        child instanceof HTMLOptGroupElement
          ? `${child.label}: ${Array.from(child.children)
              .map((option) => option.textContent)
              .join(', ')}`
          : child.textContent,
      )

    it("lists the holder's characters first, then the others, without archived ones", async () => {
      const { user } = await openDetails({ viewer: dm, handOf: bora, characters: CHARACTERS })

      await user.click(details().getByRole('button', { name: 'Kullan' }))

      expect(picker()).toHaveValue('')
      expect(listed()).toEqual([
        'Karakter seçilmedi',
        'Bora: Elara',
        'Ayla: Thorin, Kuzgun',
        'Başka (yaz)…',
      ])
    })

    it('shows a character added on another device without a reload', async () => {
      const { user, setCharacters } = await openDetails({ characters: [elara] })
      await user.click(details().getByRole('button', { name: 'Kullan' }))

      setCharacters({ characters: ready([elara, testCharacter('Lyra', me.id)]) })

      expect(listed()).toContain('Gökay: Lyra')
    })

    it('sends a typed name for a character without a record', async () => {
      const { user, actions } = await openDetails({ characters: CHARACTERS })

      await user.click(details().getByRole('button', { name: 'Kullan' }))
      await user.selectOptions(picker(), 'Başka (yaz)…')
      await user.type(details().getByRole('textbox', { name: 'Karakterin adı' }), 'Goblin şefi')
      await user.click(details().getByRole('button', { name: 'Kullanımı onayla (3 LP)' }))

      expect(actions.closeHolding).toHaveBeenCalledWith(
        expect.objectContaining({ target: { kind: 'typed', name: 'Goblin şefi' } }),
      )
    })

    it('sends no character for an empty typed name', async () => {
      const { user, actions } = await openDetails({ characters: CHARACTERS })

      await user.click(details().getByRole('button', { name: 'Kullan' }))
      await user.selectOptions(picker(), 'Başka (yaz)…')
      await user.click(details().getByRole('button', { name: 'Kullanımı onayla (3 LP)' }))

      expect(actions.closeHolding).toHaveBeenCalledWith(
        expect.objectContaining({ target: { kind: 'none' } }),
      )
    })

    it('says so when the chosen character is archived meanwhile', async () => {
      const { user, actions, setCharacters } = await openDetails({ characters: CHARACTERS })
      await user.click(details().getByRole('button', { name: 'Kullan' }))
      await user.selectOptions(picker(), 'Kuzgun')

      setCharacters({ characters: ready([thorin, { ...kuzgun, archived: true }, elara]) })

      expect(details().getByRole('alert')).toHaveTextContent(
        'Bu karakter artık seçilemiyor. Başka bir karakter seç.',
      )
      expect(picker()).toHaveValue('')
      expect(actions.closeHolding).not.toHaveBeenCalled()
    })

    it('explains a character the server says is gone', async () => {
      const actions = fakeActions()
      actions.closeHolding.mockRejectedValue(new HoldingError('character-unavailable'))
      const { user } = await openDetails({ actions, characters: [testCharacter('Lyra', me.id)] })

      await user.click(details().getByRole('button', { name: 'Kullan' }))
      await user.selectOptions(picker(), 'Lyra')
      await user.click(details().getByRole('button', { name: 'Kullanımı onayla (3 LP)' }))

      expect(await details().findByRole('alert')).toHaveTextContent(
        'Bu karakter artık seçilemiyor.',
      )
      expect(host.isClosed()).toBe(false)
    })
  })

  describe('HoldingDialog zoom', () => {
    it("zooms the details' face, and closing the zoom view as Escape does leaves the details open", async () => {
      const { user } = await openDetails({ holding: { note: 'Boss savaşında kullan' } })
      const detailsBox = host.container()
      const magnifier = within(detailsBox).getByRole('button', { name: 'Night Owl: büyüt' })

      await user.click(magnifier)

      const zooms = screen
        .getAllByRole<HTMLDialogElement>('dialog', { name: 'Night Owl' })
        .filter((dialog) => dialog !== detailsBox)
      expect(zooms).toHaveLength(1)
      const zoom = zooms[0]!
      expect(zoom).not.toHaveTextContent('Kesqerian Nights · Cost 3 · Common')
      expect(zoom).not.toHaveTextContent('Boss savaşında kullan')

      act(() => zoom.close())

      expect(screen.queryAllByRole('dialog').filter((dialog) => dialog !== detailsBox)).toEqual([])
      expect(host.container()).toBe(detailsBox)
      expect(magnifier).toHaveFocus()
    })

    it('closes only the zoom view with a click outside it, leaving the details open', async () => {
      const { user } = await openDetails()
      const detailsBox = host.container()
      const magnifier = within(detailsBox).getByRole('button', { name: 'Night Owl: büyüt' })
      await user.click(magnifier)
      const zoom = screen
        .getAllByRole('dialog', { name: 'Night Owl' })
        .find((dialog) => dialog !== detailsBox)!
      zoom.getBoundingClientRect = () => new DOMRect(100, 50, 600, 800)

      // The zoom view's backdrop covers the page, the details included.
      fireEvent.pointerDown(zoom, { clientX: 40, clientY: 400 })
      fireEvent.click(zoom, { clientX: 40, clientY: 400 })

      expect(screen.queryAllByRole('dialog').filter((dialog) => dialog !== detailsBox)).toEqual([])
      expect(host.container()).toBe(detailsBox)
      expect(magnifier).toHaveFocus()
    })
  })
})
