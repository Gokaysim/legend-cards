import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ArtManifest } from '@/features/art/schema'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { testPicturePath } from '@/test/artFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { stubWideWindow } from '@/test/media'
import { renderApp } from '@/test/renderApp'
import type { TestTrueWords } from '@/test/TestTrueWordsProvider'
import { testLearnedWord, testTrueWord, testWordDraft } from '@/test/trueWordFixtures'

import type { TrueWordActions } from './trueWordsContext'

const ABYSS = testTrueWord('Abyss', { cost: '5', text: 'A random card is free.' })
const AID = testTrueWord('Aid', { text: 'Aid Another as a swift action.' })
const CHAOS = testTrueWord('Chaos')
const DRAGON = testTrueWord('Dragon', { cost: 'X', text: 'Breathe fire.' })
const OLD = testTrueWord('Old', { status: 'retired' })
const WORDS = [ABYSS, AID, CHAOS, DRAGON, OLD]

const me = testProfile({ displayName: 'Gökay' })
const ayla = testProfile({ id: 'ayla', displayName: 'Ayla', lp: 4 })
const dm = testProfile({ role: 'dm', displayName: 'Dana' })

const learned = (id: string, word: typeof ABYSS, millis: number, extra = {}) =>
  testLearnedWord(id, word, 'ayla', { learnedAt: Timestamp.fromMillis(millis), ...extra })

const main = () => within(screen.getByRole('main'))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function fakeActions() {
  return {
    teachWord: vi.fn<TrueWordActions['teachWord']>(() => Promise.resolve('r-new')),
    takeBackWord: vi.fn<TrueWordActions['takeBackWord']>(() => Promise.resolve()),
    setActive: vi.fn<TrueWordActions['setActive']>(() => Promise.resolve()),
  }
}

/** Ayla's hand on its True Words tab, as `viewer` (signed in as `testUser`). */
function renderTab({
  viewer = me,
  path = '/hands/ayla?tab=true-words',
  trueWords = {},
  table,
  art,
}: {
  viewer?: typeof me
  path?: string
  trueWords?: TestTrueWords
  table?: { openPackId: string | null }
  art?: ArtManifest
} = {}) {
  const actions = fakeActions()
  const view = renderApp({
    path,
    users: {
      currentProfile: ready({ ...viewer, id: testUser.uid }),
      profiles: ready([ayla, { ...viewer, id: testUser.uid }]),
    },
    trueWords: {
      words: ready(WORDS),
      knownWords: ready([learned('r2', ABYSS, 2000), learned('r1', AID, 1000, { active: true })]),
      ...trueWords,
      actions: { ...actions, ...trueWords.actions },
    },
    table,
    art,
  })
  return { ...view, actions, user: userEvent.setup() }
}

describe('the hand tabs', () => {
  it('opens on the cards, and switches to the True Words tab, kept in the URL', async () => {
    const { user, router } = renderTab({ path: '/hands/ayla' })

    expect(main().getByRole('tab', { name: '♠ Kartlar' })).toHaveAttribute('aria-selected', 'true')
    expect(main().getByText('Bu elde henüz kart yok.')).toBeInTheDocument()

    await user.click(main().getByRole('tab', { name: '✦ True Words' }))

    expect(router.state.location.search).toBe('?tab=true-words')
    expect(main().getByRole('tab', { name: '✦ True Words' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(main().getByRole('list', { name: 'Bilinen True Words' })).toBeInTheDocument()

    await user.click(main().getByRole('tab', { name: '♠ Kartlar' }))
    expect(router.state.location.search).toBe('')
  })
})

describe('the True Words tab', () => {
  it("is headed with the player's name", () => {
    renderTab()
    expect(main().getByRole('heading', { level: 2, name: 'Ayla — True Words' })).toBeVisible()
  })

  it("lists the player's words in the order learned, with cost, text and active state without pictures", () => {
    renderTab()

    const list = within(main().getByRole('list', { name: 'Bilinen True Words' }))
    expect(list.getAllByRole('article').map((tile) => tile.getAttribute('aria-label'))).toEqual([
      'Aid',
      'Abyss',
    ])
    const aid = within(list.getByRole('article', { name: 'Aid' }))
    expect(aid.getByText('1 LP')).toBeInTheDocument()
    expect(aid.getByText('Aid Another as a swift action.')).toBeInTheDocument()
    expect(aid.getByText('● Aktif')).toBeInTheDocument()
    expect(within(list.getByRole('article', { name: 'Abyss' })).queryByText('● Aktif')).toBeNull()
  })

  it('makes an active word glow purple, and lifts the tiles that open their details', () => {
    renderTab()

    const list = within(main().getByRole('list', { name: 'Bilinen True Words' }))
    const aid = list.getByRole('article', { name: 'Aid' })
    const abyss = list.getByRole('article', { name: 'Abyss' })
    expect(aid).toHaveAttribute('data-glow', 'word')
    expect(aid).toHaveClass('glow-word')
    expect(abyss).not.toHaveAttribute('data-glow')
    expect(abyss).not.toHaveClass('glow-word')
    expect(aid.closest('li')).toHaveClass(
      'motion-safe:hover:-translate-y-1.25',
      'motion-safe:has-focus-visible:-translate-y-1.25',
    )
  })

  it('shows a word with a picture as its picture alone, its name, cost and text left to screen readers', () => {
    const picture = testPicturePath('word', ABYSS.id)
    renderTab({
      trueWords: {
        words: ready(WORDS.map((word) => (word.id === ABYSS.id ? { ...word, picture } : word))),
      },
    })

    const list = within(main().getByRole('list', { name: 'Bilinen True Words' }))
    const abyss = list.getByRole('article', { name: 'Abyss' })
    expect(abyss).toHaveAttribute('data-look', 'picture')
    expect(within(abyss).getByText('5 LP').closest('header')).toHaveClass('sr-only')
    expect(within(abyss).getByText('A random card is free.')).toHaveClass('sr-only')
    // Aid has no picture, so it keeps its whole tile.
    expect(list.getByRole('article', { name: 'Aid' })).not.toHaveAttribute('data-look')
    expect(list.getByRole('button', { name: 'Abyss: ayrıntılar' })).toBeInTheDocument()
  })

  it('says so when the player knows no word', () => {
    renderTab({ trueWords: { knownWords: ready([]) } })
    expect(main().getByText('Henüz True Word öğrenilmedi.')).toBeVisible()
  })

  it('links a player to their own draft, and the DM to the draft for this player', () => {
    const { unmount } = renderTab({ path: `/hands/${testUser.uid}?tab=true-words` })
    expect(main().getByRole('link', { name: '✦ True Word Draft' })).toHaveAttribute(
      'href',
      '/true-words',
    )
    unmount()

    renderTab({ viewer: dm })
    expect(main().getByRole('link', { name: '✦ True Word Draft' })).toHaveAttribute(
      'href',
      '/true-words?for=ayla',
    )
  })

  it("shows the player's open draft to everyone, read-only for other players", () => {
    renderTab({
      trueWords: { openDrafts: ready([testWordDraft('d1', 'ayla', [CHAOS, DRAGON, OLD])]) },
    })

    const panel = within(main().getByRole('region', { name: "Ayla için açık True Word draft'ı" }))
    expect(panel.getByText(/Ayla seçiyor…/)).toBeInTheDocument()
    expect(panel.queryByRole('button')).toBeNull()
  })

  it('shows a word read-only to a player', async () => {
    const { user } = renderTab()

    await user.click(main().getByRole('button', { name: 'Abyss: ayrıntılar' }))

    const dialog = within(screen.getByRole('dialog', { name: '✦ Abyss' }))
    expect(dialog.getByText('5 LP')).toBeInTheDocument()
    expect(dialog.getByText('DM öğretti')).toBeInTheDocument()
    expect(dialog.queryByRole('button', { name: 'Aktif et' })).toBeNull()
    expect(dialog.queryByRole('button', { name: 'Geri al' })).toBeNull()
    expect(dialog.queryByRole('button', { name: 'Kullan' })).toBeNull()
  })
})

describe('using a word', () => {
  /** The signed-in player, who knows Abyss (5 LP) and Dragon (X) and has `lp` LP, on their own True Words tab. */
  function renderOwnTab({
    lp = 6,
    table,
  }: { lp?: number; table?: { openPackId: string | null } } = {}) {
    const recordWordUse = vi.fn<TrueWordActions['recordWordUse']>(() => Promise.resolve('u-new'))
    const player = testProfile({ displayName: 'Gökay', lp })
    const view = renderApp({
      path: `/hands/${testUser.uid}?tab=true-words`,
      users: { currentProfile: ready(player), profiles: ready([player, ayla]) },
      trueWords: {
        words: ready(WORDS),
        knownWords: ready([
          testLearnedWord('r-abyss', ABYSS, testUser.uid),
          testLearnedWord('r-dragon', DRAGON, testUser.uid),
        ]),
        actions: { recordWordUse },
      },
      table,
    })
    return { ...view, recordWordUse, user: userEvent.setup() }
  }

  it('lets a player use their word for its price, and says so, keeping the details open', async () => {
    const { user, recordWordUse } = renderOwnTab()

    await user.click(main().getByRole('button', { name: 'Abyss: ayrıntılar' }))
    const dialog = within(screen.getByRole('dialog', { name: '✦ Abyss' }))
    await user.click(dialog.getByRole('button', { name: 'Kullan' }))
    expect(dialog.getByText('6 LP → 1 LP')).toBeInTheDocument()
    expect(dialog.queryByRole('textbox', { name: /Hangi karakter/ })).not.toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Kullanımı onayla (5 LP)' }))

    expect(recordWordUse).toHaveBeenCalledExactlyOnceWith({
      recordId: 'r-abyss',
      by: testUser.uid,
      amount: 5,
    })
    expect(dialog.getByRole('status')).toHaveTextContent('Abyss kullanıldı (−5 LP).')
    expect(dialog.getByRole('button', { name: 'Kullan' })).toBeInTheDocument()
  })

  it('asks the player how much to pay for an X word', async () => {
    const { user, recordWordUse } = renderOwnTab()

    await user.click(main().getByRole('button', { name: 'Dragon: ayrıntılar' }))
    const dialog = within(screen.getByRole('dialog', { name: '✦ Dragon' }))
    await user.click(dialog.getByRole('button', { name: 'Kullan' }))
    await user.type(dialog.getByRole('spinbutton', { name: 'Kaç LP ödenecek?' }), '2')
    await user.click(dialog.getByRole('button', { name: 'Kullanımı onayla (2 LP)' }))

    expect(recordWordUse).toHaveBeenCalledWith({
      recordId: 'r-dragon',
      by: testUser.uid,
      amount: 2,
    })
  })

  it('does not let a player use a word that costs more than their LP', async () => {
    const { user } = renderOwnTab({ lp: 1 })

    await user.click(main().getByRole('button', { name: 'Abyss: ayrıntılar' }))
    const dialog = within(screen.getByRole('dialog', { name: '✦ Abyss' }))
    await user.click(dialog.getByRole('button', { name: 'Kullan' }))

    expect(dialog.getByRole('button', { name: 'Kullanımı onayla (5 LP)' })).toBeDisabled()
    expect(dialog.getByText("Bu kullanım 5 LP tutuyor; Gökay'ın 1 LP'si var.")).toBeInTheDocument()
  })

  it("lets the DM use a player's word for free", async () => {
    const recordWordUse = vi.fn<TrueWordActions['recordWordUse']>(() => Promise.resolve('u-new'))
    const { user } = renderTab({ viewer: dm, trueWords: { actions: { recordWordUse } } })

    await user.click(main().getByRole('button', { name: 'Abyss: ayrıntılar' }))
    const dialog = within(screen.getByRole('dialog', { name: '✦ Abyss' }))
    await user.click(dialog.getByRole('button', { name: 'Kullan' }))
    const amount = dialog.getByRole('spinbutton', { name: "Tutar (Ayla'nın LP'sinden)" })
    expect(amount).toHaveValue(5)
    expect(dialog.getByRole('button', { name: 'Kullanımı onayla (5 LP)' })).toBeDisabled()
    await user.clear(amount)
    await user.type(amount, '0')
    await user.click(dialog.getByRole('button', { name: 'Kullanımı onayla' }))

    expect(recordWordUse).toHaveBeenCalledWith({ recordId: 'r2', by: testUser.uid, amount: 0 })
    expect(dialog.getByRole('status')).toHaveTextContent('Abyss kullanıldı.')
  })

  it('disables "Kullan" while a pack is open, and says why', async () => {
    const { user } = renderOwnTab({ table: { openPackId: 'p1' } })

    await user.click(main().getByRole('button', { name: 'Abyss: ayrıntılar' }))
    const dialog = within(screen.getByRole('dialog', { name: '✦ Abyss' }))

    expect(dialog.getByRole('button', { name: 'Kullan' })).toBeDisabled()
    expect(dialog.getByText(TABLE_BUSY_NOTE)).toBeVisible()
  })

  it('does not try a use offline, and says that a connection is needed', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { user, recordWordUse } = renderOwnTab()

    await user.click(main().getByRole('button', { name: 'Abyss: ayrıntılar' }))
    const dialog = within(screen.getByRole('dialog', { name: '✦ Abyss' }))
    await user.click(dialog.getByRole('button', { name: 'Kullan' }))
    await user.click(dialog.getByRole('button', { name: 'Kullanımı onayla (5 LP)' }))

    expect(recordWordUse).not.toHaveBeenCalled()
    expect(dialog.getByRole('alert')).toHaveTextContent(
      'Bağlantı yok: True Word işlemleri için internet bağlantısı gerekiyor.',
    )
  })
})

describe("the DM's word controls", () => {
  it('switches a word active, even while a pack is open', async () => {
    const { user, actions } = renderTab({ viewer: dm, table: { openPackId: 'p1' } })

    await user.click(main().getByRole('button', { name: 'Abyss: ayrıntılar' }))
    await user.click(screen.getByRole('button', { name: 'Aktif et' }))

    expect(actions.setActive).toHaveBeenCalledWith('r2', true)
  })

  it('takes back a word after a confirmation', async () => {
    const { user, actions } = renderTab({ viewer: dm })

    await user.click(main().getByRole('button', { name: 'Aid: ayrıntılar' }))
    const dialog = within(screen.getByRole('dialog', { name: '✦ Aid' }))
    await user.click(dialog.getByRole('button', { name: 'Geri al' }))
    expect(
      dialog.getByText(
        "Ayla bu True Word'ü artık bilmeyecek. Kayıt silinmez, İşlem Logu'nda görünür. Geri alınsın mı?",
      ),
    ).toBeVisible()
    await user.click(dialog.getByRole('button', { name: 'Evet, geri al' }))

    expect(actions.takeBackWord).toHaveBeenCalledWith({ recordId: 'r1', by: testUser.uid })
  })

  it('does not take back a word while a pack is open', async () => {
    const { user } = renderTab({ viewer: dm, table: { openPackId: 'p1' } })

    await user.click(main().getByRole('button', { name: 'Aid: ayrıntılar' }))

    expect(screen.getByRole('button', { name: 'Geri al' })).toBeDisabled()
    expect(within(screen.getByRole('dialog')).getByText(TABLE_BUSY_NOTE)).toBeVisible()
  })

  it('teaches a word the player does not know, found by name or text', async () => {
    const { user, actions } = renderTab({ viewer: dm })

    await user.click(main().getByRole('button', { name: '+ True Word öğret' }))
    const dialog = within(screen.getByRole('dialog', { name: "Ayla'ya True Word öğret" }))
    expect(dialog.getAllByRole('article').map((tile) => tile.getAttribute('aria-label'))).toEqual([
      'Chaos',
      'Dragon',
    ])
    await user.type(dialog.getByLabelText('Ara'), 'fire')
    expect(dialog.getAllByRole('article').map((tile) => tile.getAttribute('aria-label'))).toEqual([
      'Dragon',
    ])
    await user.click(dialog.getByRole('button', { name: 'Dragon: öğret' }))

    expect(actions.teachWord).toHaveBeenCalledWith({
      uid: 'ayla',
      wordId: DRAGON.id,
      by: testUser.uid,
    })
  })

  it('offers no teaching to players', () => {
    renderTab()
    expect(main().queryByRole('button', { name: '+ True Word öğret' })).toBeNull()
  })
})

describe('the "Seçili True Word" panel on a wide window', () => {
  const panel = () => screen.getByRole('region', { name: 'Seçili True Word' })

  it('asks to select a word, then shows its details without a dialog, and marks its tile', async () => {
    stubWideWindow()
    const { user } = renderTab()

    expect(within(panel()).getByText('Bir True Word seç')).toBeVisible()

    await user.click(main().getByRole('button', { name: 'Abyss: ayrıntılar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(panel()).getByRole('heading', { level: 3, name: 'Abyss' })).toBeVisible()
    expect(within(panel()).getByText('5 LP')).toBeInTheDocument()
    expect(within(panel()).getByText('DM öğretti')).toBeInTheDocument()
    expect(main().getByRole('button', { name: 'Abyss: ayrıntılar' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    const list = within(main().getByRole('list', { name: 'Bilinen True Words' }))
    expect(list.getByRole('article', { name: 'Abyss' })).toHaveAttribute('data-glow', 'selected')
  })

  it("shows an active word's badge, its labels and who knows it, in the frame of a card's details", async () => {
    stubWideWindow()
    const { user } = renderTab()

    await user.click(main().getByRole('button', { name: 'Aid: ayrıntılar' }))

    expect(within(panel()).getByRole('list', { name: 'Durum' })).toHaveTextContent('Aktif')
    const labels = within(within(panel()).getByRole('list', { name: 'True Word bilgileri' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent)
    expect(labels).toEqual(['1 LP', 'DM öğretti'])
    expect(within(panel()).getByText('Ayla biliyor')).toBeInTheDocument()
    expect(within(panel()).queryByRole('region', { name: 'DM araçları' })).not.toBeInTheDocument()
  })

  it("gives the DM the word's controls in the panel, and clears it once the word is taken back", async () => {
    stubWideWindow()
    const { user, actions } = renderTab({ viewer: dm })

    await user.click(main().getByRole('button', { name: 'Aid: ayrıntılar' }))
    const tools = within(within(panel()).getByRole('region', { name: 'DM araçları' }))
    expect(tools.getByRole('button', { name: 'Geri al' })).toBeInTheDocument()
    await user.click(tools.getByRole('button', { name: 'Aktifliği kaldır' }))
    expect(actions.setActive).toHaveBeenCalledWith('r1', false)

    await user.click(within(panel()).getByRole('button', { name: 'Geri al' }))
    await user.click(within(panel()).getByRole('button', { name: 'Evet, geri al' }))

    expect(actions.takeBackWord).toHaveBeenCalledWith({ recordId: 'r1', by: testUser.uid })
    expect(within(panel()).getByText('Bir True Word seç')).toBeVisible()
  })

  it('shows the selected card again after switching tabs and back', async () => {
    stubWideWindow()
    const { user } = renderTab()

    await user.click(main().getByRole('button', { name: 'Abyss: ayrıntılar' }))
    await user.click(main().getByRole('tab', { name: '♠ Kartlar' }))
    expect(screen.getByRole('region', { name: 'Seçili Kart' })).toBeInTheDocument()

    await user.click(main().getByRole('tab', { name: '✦ True Words' }))
    expect(within(panel()).getByRole('heading', { level: 3, name: 'Abyss' })).toBeVisible()
  })
})
