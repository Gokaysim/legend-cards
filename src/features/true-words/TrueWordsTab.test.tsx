import { screen, within } from '@testing-library/react'
import { Timestamp } from 'firebase/firestore'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'
import type { TestTrueWords } from '@/test/TestTrueWordsProvider'
import { testLearnedWord, testTrueWord, testWordDraft } from '@/test/trueWordFixtures'

import type { WordFields } from '@/features/definitions/api'
import type { DefinitionActions } from '@/features/definitions/definitionsContext'

import { WordError } from './errors'
import type { TrueWordActions } from './trueWordsContext'

afterEach(() => {
  vi.restoreAllMocks()
})

const ABYSS = testTrueWord('Abyss', { cost: '5', text: 'A random card is free. [meta]' })
const AID = testTrueWord('Aid')
const CHAOS = testTrueWord('Chaos', { cost: '0' })
const DRAGON = testTrueWord('Dragon', { cost: 'X' })
const HOARD = testTrueWord('Hoard', { cost: '2' })
const OLD = testTrueWord('Old', { status: 'retired' })
const WORDS = [HOARD, DRAGON, OLD, CHAOS, AID, ABYSS]

const me = testProfile({ displayName: 'Ayla', lp: 5 })
const bora = testProfile({ id: 'bora', displayName: 'Bora', lp: 4 })
const dm = testProfile({ role: 'dm', displayName: 'Dana', lp: 0 })

const main = () => within(screen.getByRole('main'))

function fakeActions() {
  return {
    startDraft: vi.fn<TrueWordActions['startDraft']>(() => Promise.resolve('d-new')),
  }
}

function renderScreen({
  path = '/library?tab=true-words',
  viewer = me,
  trueWords = {},
  table,
}: {
  path?: string
  viewer?: typeof me
  trueWords?: TestTrueWords
  table?: { openPackId: string | null }
} = {}) {
  const actions = fakeActions()
  const view = renderApp({
    path,
    users: { currentProfile: ready(viewer), profiles: ready([viewer, bora]) },
    trueWords: { words: ready(WORDS), ...trueWords, actions: { ...actions, ...trueWords.actions } },
    table,
  })
  return { ...view, actions, user: userEvent.setup() }
}

const tileNames = () =>
  main()
    .getAllByRole('article')
    .map((tile) => tile.getAttribute('aria-label'))

describe("the Kütüphane's True Words tab", () => {
  it('lists every active word by name as a face, with its cost and visible text, and marks the known ones', () => {
    renderScreen({
      trueWords: { knownWords: ready([testLearnedWord('r1', AID, testUser.uid)]) },
    })

    expect(tileNames()).toEqual(['Abyss', 'Aid', 'Chaos', 'Dragon', 'Hoard'])
    const abyss = main().getByRole('article', { name: 'Abyss' })
    expect(abyss).toHaveAttribute('data-frame', 'word')
    expect(abyss).toHaveTextContent('Cost: 5')
    expect(within(abyss).getByText('A random card is free.')).toBeInTheDocument()
    expect(abyss).not.toHaveTextContent('meta')
    expect(within(main().getByRole('article', { name: 'Aid' })).getByText('Biliyor')).toBeVisible()
    expect(within(abyss).queryByText('Biliyor')).toBeNull()
    // The draft section says how many words Ayla knows, once: the list's count line does not repeat it.
    expect(main().getAllByText(/1 True Word biliyor/)).toHaveLength(1)
    expect(main().getByRole('region', { name: 'Draft' })).toHaveTextContent(
      'Ayla · 1 True Word biliyor',
    )
  })

  it('shows an X cost as "X" on the face and in the list (An X cost)', async () => {
    const { user } = renderScreen()
    expect(main().getByRole('article', { name: 'Dragon' })).toHaveTextContent('Cost: X')

    await user.click(main().getByRole('button', { name: '☷ Liste' }))
    expect(
      within(main().getByRole('row', { name: /Dragon/ })).getAllByRole('cell')[0],
    ).toHaveTextContent(/^X$/)
  })

  it("lets the DM choose a player, kept in the URL, and marks that player's words", async () => {
    const { user, router } = renderScreen({
      viewer: { ...dm, id: testUser.uid },
      trueWords: { knownWords: ready([testLearnedWord('r1', CHAOS, 'bora')]) },
    })

    await user.selectOptions(main().getByLabelText('Kimin için'), 'bora')

    expect(router.state.location.search).toBe('?tab=true-words&for=bora')
    expect(
      within(main().getByRole('article', { name: 'Chaos' })).getByText('Biliyor'),
    ).toBeVisible()
    expect(main().getByText(/Bora · 1 True Word biliyor/)).toBeInTheDocument()
  })

  it('shows who knows each word as its Durum, and a word kept out of drafts as "DM\'e özel"', async () => {
    const justice = testTrueWord('Justice', { isInDraws: false })
    const { user } = renderScreen({
      trueWords: {
        words: ready([...WORDS, justice]),
        knownWords: ready([
          testLearnedWord('r1', ABYSS, testUser.uid, { learnedAt: Timestamp.fromMillis(1000) }),
          testLearnedWord('r2', ABYSS, 'bora', { learnedAt: Timestamp.fromMillis(2000) }),
          testLearnedWord('r3', justice, 'bora'),
        ]),
      },
    })

    await user.click(main().getByRole('button', { name: '☷ Liste' }))

    const durum = (name: string) =>
      within(main().getByRole('row', { name: new RegExp(name) }))
        .getAllByRole('cell')
        .at(-1)
    expect(durum('Abyss')).toHaveTextContent('Bilenler: Ayla, Bora')
    expect(durum('Hoard')).toHaveTextContent('—')
    expect(durum('Justice')).toHaveTextContent("DM'e özel · Bilenler: Bora")
  })

  it('lists only the chosen player\'s unlearned words with "Yalnızca öğrenilmemişler", live', async () => {
    const known = [
      testLearnedWord('r1', ABYSS, testUser.uid),
      testLearnedWord('r2', AID, testUser.uid),
    ]
    const { user, setTrueWords } = renderScreen({
      trueWords: { knownWords: ready(known) },
    })

    await user.click(main().getByRole('checkbox', { name: 'Yalnızca öğrenilmemişler' }))
    expect(tileNames()).toEqual(['Chaos', 'Dragon', 'Hoard'])

    // Ayla learns "Dragon" on another device.
    setTrueWords({
      words: ready(WORDS),
      knownWords: ready([...known, testLearnedWord('r3', DRAGON, testUser.uid)]),
      actions: {},
    })
    expect(tileNames()).toEqual(['Chaos', 'Hoard'])
  })

  it('lists the words Bora does not know when the DM chooses him and turns on "Yalnızca öğrenilmemişler"', async () => {
    const { user } = renderScreen({
      path: '/library?tab=true-words&for=bora',
      viewer: { ...dm, id: testUser.uid },
      trueWords: { knownWords: ready([testLearnedWord('r1', CHAOS, 'bora')]) },
    })

    await user.click(main().getByRole('checkbox', { name: 'Yalnızca öğrenilmemişler' }))
    expect(tileNames()).toEqual(['Abyss', 'Aid', 'Dragon', 'Hoard'])
  })

  it("leaves a hidden word out of a player's tab, and lists it for the DM, marked (A hidden word)", () => {
    const justice = testTrueWord('Justice', { isInLibrary: false })
    const view = renderScreen({ trueWords: { words: ready([...WORDS, justice]) } })
    expect(tileNames()).not.toContain('Justice')
    view.unmount()

    renderScreen({ viewer: dm, trueWords: { words: ready([...WORDS, justice]) } })
    expect(main().getByRole('article', { name: 'Justice' })).toHaveTextContent('🔒 DM')
  })

  it('shows the open draft above the list (An open draft on the tab)', () => {
    renderScreen({
      trueWords: { openDrafts: ready([testWordDraft('d1', testUser.uid, [CHAOS, DRAGON, HOARD])]) },
    })

    const panel = main().getByRole('region', { name: "Ayla için açık True Word draft'ı" })
    const list = main().getByRole('list', { name: 'Kartlar' })
    expect(panel.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('does not offer a player choice to a player', () => {
    renderScreen({ path: '/true-words?for=bora' })
    expect(main().queryByLabelText('Kimin için')).toBeNull()
    expect(main().getByText(/Ayla · 0 True Word biliyor/)).toBeInTheDocument()
  })
})

describe('starting a draft', () => {
  it("shows a player's price, 1 LP plus the words they know, and starts at that price", async () => {
    const { user, actions } = renderScreen({
      trueWords: {
        knownWords: ready([
          testLearnedWord('r1', AID, testUser.uid),
          testLearnedWord('r2', CHAOS, testUser.uid),
        ]),
      },
    })

    expect(main().getByText('3 LP', { selector: 'span' })).toBeInTheDocument()
    await user.click(main().getByRole('button', { name: '✦ Draft Başlat' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('5 LP')).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: "Draft'ı başlat (3 LP)" }))

    expect(actions.startDraft).toHaveBeenCalledWith({
      uid: testUser.uid,
      by: testUser.uid,
      amount: 'price',
      words: WORDS,
      known: new Set([AID.id, CHAOS.id]),
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('disables the start with fewer than 3 learnable words', () => {
    renderScreen({ trueWords: { words: ready([ABYSS, AID, OLD]) } })
    expect(main().getByRole('button', { name: '✦ Draft Başlat' })).toBeDisabled()
    expect(main().getByText('Draft için en az 3 öğrenilmemiş True Word gerekli.')).toBeVisible()
  })

  it('disables the start when the player cannot pay, naming the price and the LP', () => {
    renderScreen({
      viewer: { ...me, lp: 2 },
      trueWords: {
        knownWords: ready([
          testLearnedWord('r1', AID, testUser.uid),
          testLearnedWord('r2', CHAOS, testUser.uid),
          testLearnedWord('r3', HOARD, testUser.uid),
        ]),
        words: ready([...WORDS, testTrueWord('Mimic'), testTrueWord('Visage')]),
      },
    })
    expect(main().getByRole('button', { name: '✦ Draft Başlat' })).toBeDisabled()
    expect(main().getByText("Draft 4 LP tutuyor; Ayla'nın 2 LP'si var.")).toBeVisible()
  })

  it('leads to the open draft instead of starting another', () => {
    renderScreen({
      trueWords: {
        openDrafts: ready([testWordDraft('d1', testUser.uid, [ABYSS, AID, DRAGON])]),
      },
    })
    expect(main().getByRole('button', { name: '✦ Draft Başlat' })).toBeDisabled()
    expect(main().getByText("Ayla'nın açık bir draft'ı var: aşağıdan devam et.")).toBeVisible()
    expect(main().getByRole('region', { name: "Ayla için açık True Word draft'ı" })).toBeVisible()
  })

  it('disables the start while a pack is open', () => {
    renderScreen({ table: { openPackId: 'p1' } })
    expect(main().getByRole('button', { name: '✦ Draft Başlat' })).toBeDisabled()
    expect(main().getByText(TABLE_BUSY_NOTE)).toBeVisible()
  })

  it('disables the start offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    renderScreen()
    expect(main().getByRole('button', { name: '✦ Draft Başlat' })).toBeDisabled()
    expect(
      main().getByText('Bağlantı yok: draft için internet bağlantısı gerekiyor.'),
    ).toBeVisible()
  })

  it('lets the DM start a draft at the prefilled price, another amount, or for free', async () => {
    const { user, actions } = renderScreen({
      path: '/true-words?for=bora',
      viewer: { ...dm, id: testUser.uid },
    })

    await user.click(main().getByRole('button', { name: '✦ Draft Başlat' }))
    const dialog = within(screen.getByRole('dialog'))
    const amount = dialog.getByLabelText("Tutar (Bora'nın LP'sinden)")
    expect(amount).toHaveValue(1)
    expect(dialog.getByText('0 = ücretsiz')).toBeInTheDocument()
    await user.clear(amount)
    await user.type(amount, '0')
    await user.click(dialog.getByRole('button', { name: "Draft'ı başlat" }))

    expect(actions.startDraft).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'bora', by: testUser.uid, amount: 0 }),
    )
  })

  it("refuses the DM's amount above the player's LP, naming it", async () => {
    const { user, actions } = renderScreen({
      path: '/true-words?for=bora',
      viewer: { ...dm, id: testUser.uid },
    })

    await user.click(main().getByRole('button', { name: '✦ Draft Başlat' }))
    const dialog = within(screen.getByRole('dialog'))
    const amount = dialog.getByLabelText("Tutar (Bora'nın LP'sinden)")
    await user.clear(amount)
    await user.type(amount, '5')
    await user.click(dialog.getByRole('button', { name: "Draft'ı başlat" }))

    expect(dialog.getByRole('alert')).toHaveTextContent(
      "Bu draft 5 LP tutuyor; Bora'nın 4 LP'si var.",
    )
    expect(actions.startDraft).not.toHaveBeenCalled()
  })

  it('shows a failure in Turkish and keeps the dialog open', async () => {
    const { user } = renderScreen({
      trueWords: { actions: { startDraft: () => Promise.reject(new WordError('draft-open')) } },
    })

    await user.click(main().getByRole('button', { name: '✦ Draft Başlat' }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: "Draft'ı başlat (1 LP)" }))

    expect(dialog.getByRole('alert')).toHaveTextContent("Ayla'nın açık bir draft'ı var")
  })
})

describe("the True Words tab: the DM's definitions", () => {
  const ECHO = testTrueWord('Echo', { status: 'draft', cost: null, text: '' })

  it('lists only the draft words with "Taslak", each with its "✎ Düzenle" (The DM\'s drafts)', async () => {
    const { user } = renderScreen({ viewer: dm, trueWords: { words: ready([...WORDS, ECHO]) } })

    expect(tileNames()).toEqual(['Abyss', 'Aid', 'Chaos', 'Dragon', 'Hoard'])
    const filter = main().getByRole('combobox', { name: 'Durum' })
    expect(
      within(filter)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Yayında', 'Taslak', 'Kaldırıldı', '🔒 DM', 'Hepsi'])
    await user.selectOptions(filter, 'draft')

    expect(tileNames()).toEqual(['Echo'])
    const echo = within(main().getByRole('article', { name: 'Echo' }))
    expect(echo.getByText('Taslak')).toBeVisible()
    await user.click(echo.getByRole('button', { name: 'Echo: düzenle' }))
    expect(screen.getByRole('dialog', { name: 'Düzenle: Echo' })).toBeVisible()
  })

  it('saves a new word with its cost and text, refusing a name another word has', async () => {
    const addWord = vi.fn<DefinitionActions['addWord']>(() => Promise.resolve('tw-lull'))
    const user = userEvent.setup()
    renderApp({
      path: '/true-words',
      users: { currentProfile: ready(dm), profiles: ready([dm, bora]) },
      trueWords: { words: ready(WORDS) },
      definitions: { actions: { addWord } },
    })
    await user.click(screen.getByRole('button', { name: '+ True Word ekle' }))
    const form = within(screen.getByRole('dialog', { name: 'Yeni True Word' }))

    await user.type(form.getByLabelText('True Word adı'), 'abyss')
    expect(form.getByText('Bu adla bir True Word zaten var.')).toBeVisible()
    await user.clear(form.getByLabelText('True Word adı'))
    await user.type(form.getByLabelText('True Word adı'), 'Lull')
    await user.type(form.getByLabelText('Cost'), '2')
    await user.type(form.getByLabelText('Metin'), 'Quiet.')
    await user.click(form.getByRole('button', { name: 'Kaydet ve yayınla' }))

    expect(addWord).toHaveBeenCalledWith(
      expect.objectContaining({
        publish: true,
        fields: expect.objectContaining({
          name: 'Lull',
          cost: '2',
          text: 'Quiet.',
          isInLibrary: true,
          isInDraws: true,
          hasHeldEffect: false,
        }) as WordFields,
      }),
    )
  })

  it('adds a word from "+ True Word ekle"', async () => {
    const { user } = renderScreen({ viewer: dm })
    await user.click(screen.getByRole('button', { name: '+ True Word ekle' }))
    const form = within(screen.getByRole('dialog', { name: 'Yeni True Word' }))
    expect(form.getByLabelText('Cost')).toBeInTheDocument()
    expect(form.getByRole('button', { name: 'Kaydet ve yayınla' })).toBeDisabled()
  })

  it('shows a player no status filter, no "+ True Word ekle" and no "✎ Düzenle" (A player\'s controls)', () => {
    renderScreen({ trueWords: { words: ready([...WORDS, ECHO]) } })
    expect(main().queryByRole('combobox', { name: 'Durum' })).toBeNull()
    expect(screen.queryByRole('button', { name: '+ True Word ekle' })).toBeNull()
    expect(screen.queryByRole('button', { name: /düzenle/ })).toBeNull()
    expect(tileNames()).not.toContain('Echo')
  })
})
