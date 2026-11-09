import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { describe, expect, it, vi } from 'vitest'

import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'
import type { TestTrueWords } from '@/test/TestTrueWordsProvider'
import { testLearnedWord, testTrueWord, testWordDraft } from '@/test/trueWordFixtures'

import type { TrueWordActions } from './trueWordsContext'

const ABYSS = testTrueWord('Abyss', { cost: '5', text: 'A random card is free.' })
const AID = testTrueWord('Aid', { text: 'Aid Another as a swift action.' })
const CHAOS = testTrueWord('Chaos')
const DRAGON = testTrueWord('Dragon', { cost: 'X', text: 'Breathe fire.' })
const OLD = testTrueWord('Old', { retired: true })
const WORDS = [ABYSS, AID, CHAOS, DRAGON, OLD]

const me = testProfile({ displayName: 'Gökay' })
const ayla = testProfile({ id: 'ayla', displayName: 'Ayla', lp: 4 })
const dm = testProfile({ role: 'dm', displayName: 'Dana' })

const learned = (id: string, word: typeof ABYSS, millis: number, extra = {}) =>
  testLearnedWord(id, word, 'ayla', { learnedAt: Timestamp.fromMillis(millis), ...extra })

const main = () => within(screen.getByRole('main'))

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
}: {
  viewer?: typeof me
  path?: string
  trueWords?: TestTrueWords
  table?: { openPackId: string | null }
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
  it("lists the player's words in the order learned, with cost, text and active state", () => {
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
    expect(dialog.queryByRole('button', { name: '● Aktif et' })).toBeNull()
    expect(dialog.queryByRole('button', { name: 'Geri al' })).toBeNull()
  })
})

describe("the DM's word controls", () => {
  it('switches a word active, even while a pack is open', async () => {
    const { user, actions } = renderTab({ viewer: dm, table: { openPackId: 'p1' } })

    await user.click(main().getByRole('button', { name: 'Abyss: ayrıntılar' }))
    await user.click(screen.getByRole('button', { name: '● Aktif et' }))

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
