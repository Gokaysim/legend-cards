import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Card, Definition } from '@/features/cards/schema'
import { WordError } from '@/features/true-words/errors'
import type { LearnedWord } from '@/features/true-words/schema'
import type { TrueWordActions } from '@/features/true-words/trueWordsContext'
import {
  ONLY_FROM_DM,
  testBlessedCard,
  testCard,
  testCursedCard,
  testCustomCard,
} from '@/test/cardFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { renderApp } from '@/test/renderApp'
import { testLearnedWord, testTrueWord } from '@/test/trueWordFixtures'

import { HoldingError } from './errors'
import type { HoldingActions } from './holdingsContext'

afterEach(() => {
  vi.restoreAllMocks()
})

const dm = testProfile({ role: 'dm', displayName: 'Dana' })
const ayla = testProfile({ id: 'ayla', displayName: 'Ayla' })
const bora = testProfile({ id: 'bora', displayName: 'Bora' })

const eyes = testCard("Aboleth's Eyes", { setCode: 'Kesqer' })
const gaze = testCard('Aboleth Gaze', { setCode: 'Havenholm' })
const greedy = testCard('Greedy Hands', {
  setCode: 'Kesqer',
  holder: { uid: 'bora', userCardId: 'bora-greedy' },
})
const halo = testBlessedCard('Halo of Aboleths')
const visions = testCursedCard('Visions of Death', { text: 'Aboleth dreams.' })
const retired = testCard('Old Aboleth', { status: 'retired' })
const draft = testCard('Aboleth Draft', { status: 'draft' })
const wish = testCard('The Last Wish', { ...ONLY_FROM_DM })
const CARDS: Card[] = [eyes, gaze, greedy, halo, visions, retired, draft, wish]

function setup({
  viewer = dm,
  giveCard,
  cards = CARDS,
}: {
  viewer?: typeof dm
  giveCard?: HoldingActions['giveCard']
  cards?: Definition[]
} = {}) {
  const user = userEvent.setup()
  const give = vi.fn<HoldingActions['giveCard']>(giveCard ?? (() => Promise.resolve('new')))
  const view = renderApp({
    path: '/hands/ayla',
    users: { currentProfile: ready(viewer), profiles: ready([ayla, bora, viewer]) },
    cards: { cards: ready(cards) },
    holdings: {
      openHoldings: ready([testHolding(greedy, 'bora', 1000, { id: 'bora-greedy' })]),
      actions: { giveCard: give },
    },
  })
  return { user, give, ...view }
}

type User = ReturnType<typeof userEvent.setup>

const dialog = () => within(screen.getByRole('dialog', { name: 'Kart ver: Ayla' }))
/** The names of the faces in the grid, in order. */
const faces = () =>
  within(dialog().getByRole('list', { name: 'Kartlar' }))
    .getAllByRole('article')
    .map((face) => face.getAttribute('aria-label'))
/** The badge on a face. */
const badgeOf = (name: string) =>
  dialog().getByRole('article', { name }).closest('li')?.querySelector('span.pointer-events-none')
    ?.textContent
const bar = () => within(dialog().getByRole('region', { name: 'Seçili kart' }))
const count = () =>
  dialog().getByText(
    (_, element) => element?.tagName === 'P' && /^\d+ kart$/.test(element.textContent ?? ''),
  )

async function open(user: User) {
  await user.click(screen.getByRole('button', { name: '+ Kart ver' }))
}

async function openAndSearch(user: User, query: string) {
  await open(user)
  await user.type(dialog().getByRole('searchbox', { name: 'Kart ara' }), query)
}

async function select(user: User, name: string) {
  await user.click(dialog().getByRole('button', { name: `${name}: seç` }))
}

async function choose(user: User, pillName: RegExp, itemName: string) {
  await user.click(dialog().getByRole('button', { name: pillName }))
  await user.click(dialog().getByRole('menuitemradio', { name: itemName }))
}

describe('GiveCardDialog', () => {
  it('is offered to the DM only', () => {
    setup({ viewer: testProfile() })
    expect(screen.queryByRole('button', { name: '+ Kart ver' })).not.toBeInTheDocument()
  })

  it('lists every active card of both decks by name before any search, with its status', async () => {
    const { user } = setup()
    await open(user)

    expect(dialog().getByRole('searchbox', { name: 'Kart ara' })).toHaveFocus()
    expect(count()).toHaveTextContent('6 kart')
    // In name order, as the library sorts names. Drafts and retired cards are not offered.
    expect(faces()).toEqual([
      'Aboleth Gaze',
      "Aboleth's Eyes",
      'Greedy Hands',
      'Halo of Aboleths',
      'The Last Wish',
      'Visions of Death',
    ])
    expect(badgeOf("Aboleth's Eyes")).toBe('Havuzda')
    expect(badgeOf('Greedy Hands')).toBe('Bora')
    expect(badgeOf('Halo of Aboleths')).toBe('Havuzda')
    expect(badgeOf('The Last Wish')).toBe("DM'e özel")
    expect(badgeOf('Visions of Death')).toBe('Cursed')
  })

  it('searches as the library does', async () => {
    const { user } = setup()
    await openAndSearch(user, 'aboleth')

    expect(faces()).toEqual([
      'Aboleth Gaze',
      "Aboleth's Eyes",
      'Halo of Aboleths',
      'Visions of Death',
    ])
    expect(count()).toHaveTextContent('4 kart')
  })

  it('shows 20 cards at a time, and starts again at 20 when a filter changes', async () => {
    const many = Array.from({ length: 45 }, (_, index) =>
      testCard(`Card ${String(index).padStart(2, '0')}`, {
        setCode: index < 30 ? 'Kesqer' : 'Havenholm',
      }),
    )
    const { user } = setup({ cards: many })
    await open(user)

    expect(faces()).toHaveLength(20)
    expect(count()).toHaveTextContent('45 kart')
    await user.click(dialog().getByRole('button', { name: 'Daha fazla göster' }))
    expect(faces()).toHaveLength(40)

    await choose(user, /^Set/, 'Kesqerian Nights, 30 kart')
    expect(faces()).toHaveLength(20)
  })

  it("narrows to one set's Rare cards, to Cursed cards, and to the pool", async () => {
    const rare = testCard('Desert Rite', { setCode: 'Kesqer', rarity: 'rare' })
    const { user } = setup({ cards: [...CARDS, rare] })
    await open(user)

    await choose(user, /^Set/, 'Kesqerian Nights, 4 kart')
    await choose(user, /^Tür/, 'Rare, 1 kart')
    expect(faces()).toEqual(['Desert Rite'])
    expect(count()).toHaveTextContent('1 kart')

    await user.click(dialog().getByRole('button', { name: 'Temizle' }))
    await choose(user, /^Tür/, 'Cursed, 1 kart')
    expect(faces()).toEqual(['Visions of Death'])

    await user.click(dialog().getByRole('button', { name: 'Tür filtresini kaldır' }))
    await user.click(dialog().getByRole('button', { name: 'Yalnızca havuzdakiler' }))
    expect(faces()).toEqual(['Aboleth Gaze', "Aboleth's Eyes", 'Desert Rite', 'Halo of Aboleths'])
  })

  it('gives the selected pool card from the bar and stays open for the next one', async () => {
    const { user, give } = setup()
    await open(user)

    await select(user, "Aboleth's Eyes")
    expect(bar().getByText(/→ Ayla/)).toHaveTextContent("Aboleth's Eyes → Ayla")
    expect(give).not.toHaveBeenCalled()
    await user.click(bar().getByRole('button', { name: 'Ver' }))

    expect(give).toHaveBeenCalledExactlyOnceWith({
      cardId: eyes.id,
      uid: 'ayla',
      by: testUser.uid,
      allowExtraCopy: false,
    })
    expect(dialog().getByRole('status')).toHaveTextContent("Verildi: Aboleth's Eyes → Ayla")
    expect(dialog().queryByRole('region', { name: 'Seçili kart' })).not.toBeInTheDocument()

    await select(user, 'Visions of Death')
    await user.click(bar().getByRole('button', { name: 'Ver' }))
    expect(give).toHaveBeenLastCalledWith(expect.objectContaining({ cardId: visions.id }))
    expect(screen.getByRole('dialog', { name: 'Kart ver: Ayla' })).toBeInTheDocument()
  })

  it('selects a card with the keyboard', async () => {
    const { user } = setup()
    await open(user)

    dialog().getByRole('button', { name: 'Aboleth Gaze: seç' }).focus()
    await user.keyboard('{Enter}')

    expect(bar().getByText(/→ Ayla/)).toHaveTextContent('Aboleth Gaze → Ayla')
  })

  it('gives a DM-only card no one holds without asking for an extra copy', async () => {
    const { user, give } = setup()
    await open(user)

    await select(user, 'The Last Wish')
    expect(bar().queryByText(/Ek kopya/)).not.toBeInTheDocument()
    await user.click(bar().getByRole('button', { name: 'Ver' }))

    expect(give).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ cardId: wish.id, allowExtraCopy: false }),
    )
  })

  it('asks before giving an extra copy of a held card, and gives it once confirmed', async () => {
    const { user, give } = setup()
    await open(user)

    await select(user, 'Greedy Hands')

    expect(bar().getByText("Bora'nın elinde. Ek kopya verilsin mi?")).toBeVisible()
    expect(give).not.toHaveBeenCalled()

    await user.click(bar().getByRole('button', { name: 'Ek kopya ver' }))

    expect(give).toHaveBeenCalledExactlyOnceWith({
      cardId: greedy.id,
      uid: 'ayla',
      by: testUser.uid,
      allowExtraCopy: true,
    })
    expect(dialog().getByRole('status')).toHaveTextContent('Verildi: Greedy Hands → Ayla')
  })

  it('changes nothing when the selection is cancelled', async () => {
    const { user, give } = setup()
    await open(user)

    await select(user, 'Greedy Hands')
    await user.click(bar().getByRole('button', { name: 'Vazgeç' }))

    expect(give).not.toHaveBeenCalled()
    expect(dialog().queryByRole('region', { name: 'Seçili kart' })).not.toBeInTheDocument()
  })

  it('switches to the extra-copy question when the card was just taken', async () => {
    const { user, give } = setup({
      giveCard: ({ allowExtraCopy }) =>
        allowExtraCopy
          ? Promise.resolve('new')
          : Promise.reject(new HoldingError('taken', { holderUid: 'bora' })),
    })
    await open(user)

    await select(user, 'Aboleth Gaze')
    await user.click(bar().getByRole('button', { name: 'Ver' }))

    expect(bar().getByText("Bora'nın elinde. Ek kopya verilsin mi?")).toBeVisible()
    await user.click(bar().getByRole('button', { name: 'Ek kopya ver' }))
    expect(give).toHaveBeenLastCalledWith(
      expect.objectContaining({ cardId: gaze.id, allowExtraCopy: true }),
    )
    expect(dialog().getByRole('status')).toHaveTextContent('Verildi: Aboleth Gaze → Ayla')
  })

  it('shows a Turkish error for other failures', async () => {
    const { user } = setup({
      giveCard: () => Promise.reject(Object.assign(new Error('x'), { code: 'unavailable' })),
    })
    await open(user)

    await select(user, 'Visions of Death')
    await user.click(bar().getByRole('button', { name: 'Ver' }))

    expect(dialog().getByRole('alert')).toHaveTextContent(
      'Bağlantı yok: kart hareketleri için internet bağlantısı gerekiyor.',
    )
  })

  it('does not try to give a card offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { user, give } = setup()
    await open(user)

    await select(user, 'Visions of Death')
    await user.click(bar().getByRole('button', { name: 'Ver' }))

    expect(give).not.toHaveBeenCalled()
    expect(dialog().getByRole('alert')).toHaveTextContent('Bağlantı yok')
  })

  it('never lists a Custom Card, held or not', async () => {
    const custom = testCustomCard('custom-1')
    const { user } = setup({ cards: [...CARDS, custom] })
    await open(user)
    expect(count()).toHaveTextContent('6 kart')
    expect(faces()).not.toContain('3-Cost Custom Card')
  })

  it('says so when nothing matches, and closes with the close button', async () => {
    const { user } = setup()
    await openAndSearch(user, 'no such card')
    expect(dialog().getByText('Kart bulunamadı.')).toBeVisible()

    await user.click(dialog().getByRole('button', { name: '✕ Kapat' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('GiveCardDialog with True Words', () => {
  const ascend = testTrueWord('Ascend 3', { isInDraws: false, isInLibrary: false })
  const aid = testTrueWord('Aid')
  const abyss = testTrueWord('Abyss')
  const echo = testTrueWord('Echo')
  const oldWord = testTrueWord('Old Word', { status: 'retired' })
  const WORDS = [ascend, aid, abyss, echo, oldWord]
  const aylaKnowsAbyss = testLearnedWord('r-abyss', abyss, 'ayla')
  const boraKnowsAid = testLearnedWord('r-aid', aid, 'bora')

  function setupWords({
    teachWord,
    initialRecords = [aylaKnowsAbyss, boraKnowsAid],
  }: {
    teachWord?: TrueWordActions['teachWord']
    initialRecords?: LearnedWord[]
  } = {}) {
    const user = userEvent.setup()
    const teach = vi.fn<TrueWordActions['teachWord']>(
      teachWord ?? (() => Promise.resolve('test-record')),
    )
    const trueWords = (records: LearnedWord[]) => ({
      words: ready(WORDS),
      knownWords: ready(records),
      actions: { teachWord: teach },
    })
    const view = renderApp({
      path: '/hands/ayla',
      users: { currentProfile: ready(dm), profiles: ready([ayla, bora, dm]) },
      cards: { cards: ready([eyes, wish]) },
      holdings: { openHoldings: ready([]) },
      trueWords: trueWords(initialRecords),
    })
    return { user, teach, trueWords, ...view }
  }

  it('lists the active words with the cards, by name, with their badges', async () => {
    const { user } = setupWords()
    await open(user)

    expect(count()).toHaveTextContent('6 kart')
    expect(faces()).toEqual(["Aboleth's Eyes", 'Abyss', 'Aid', 'Ascend 3', 'Echo', 'The Last Wish'])
    expect(badgeOf('Ascend 3')).toBe("DM'e özel")
    expect(badgeOf('Aid')).toBe('Bora')
    expect(badgeOf('Abyss')).toBe('Biliyor')
    expect(badgeOf('Echo')).toBeUndefined()
  })

  it('finds a word by its name', async () => {
    const { user } = setupWords()
    await openAndSearch(user, 'ascend')

    expect(faces()).toEqual(['Ascend 3'])
  })

  it("narrows to True Words and keeps the drafts' words in the pool", async () => {
    const { user } = setupWords()
    await open(user)

    await choose(user, /^Tür/, 'True Word, 4 kart')
    expect(faces()).toEqual(['Abyss', 'Aid', 'Ascend 3', 'Echo'])

    await user.click(dialog().getByRole('button', { name: 'Yalnızca havuzdakiler' }))
    expect(faces()).toEqual(['Abyss', 'Aid', 'Echo'])
  })

  it('teaches a word only the DM gives from the bar, and stays open', async () => {
    const { user, teach, trueWords, setTrueWords } = setupWords()
    await openAndSearch(user, 'ascend')

    await select(user, 'Ascend 3')
    expect(bar().getByText(/→ Ayla/)).toHaveTextContent('Ascend 3 → Ayla')
    expect(bar().queryByText(/Ek kopya/)).not.toBeInTheDocument()
    await user.click(bar().getByRole('button', { name: 'Öğret' }))

    expect(teach).toHaveBeenCalledExactlyOnceWith({
      uid: 'ayla',
      wordId: ascend.id,
      by: testUser.uid,
    })
    expect(dialog().getByRole('status')).toHaveTextContent('Öğretildi: Ascend 3 → Ayla')

    setTrueWords(
      trueWords([aylaKnowsAbyss, boraKnowsAid, testLearnedWord('r-ascend', ascend, 'ayla')]),
    )
    expect(badgeOf('Ascend 3')).toBe('Biliyor')
    expect(dialog().queryByRole('button', { name: 'Ascend 3: seç' })).not.toBeInTheDocument()
  })

  it('does not let a word the receiver knows be selected', async () => {
    const { user } = setupWords()
    await open(user)

    expect(dialog().queryByRole('button', { name: 'Abyss: seç' })).not.toBeInTheDocument()
    await user.click(dialog().getByRole('article', { name: 'Abyss' }))
    expect(dialog().queryByRole('region', { name: 'Seçili kart' })).not.toBeInTheDocument()
  })

  it('shows the word error when the teach fails', async () => {
    const { user } = setupWords({
      teachWord: () => Promise.reject(new WordError('word-known')),
    })
    await open(user)

    await select(user, 'Echo')
    await user.click(bar().getByRole('button', { name: 'Öğret' }))

    expect(dialog().getByRole('alert')).toHaveTextContent("Ayla bu True Word'ü zaten biliyor.")
    expect(dialog().queryByRole('status')).not.toBeInTheDocument()
  })

  it('does not try to teach a word offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { user, teach } = setupWords()
    await open(user)

    await select(user, 'Echo')
    await user.click(bar().getByRole('button', { name: 'Öğret' }))

    expect(teach).not.toHaveBeenCalled()
    expect(dialog().getByRole('alert')).toHaveTextContent('Bağlantı yok')
  })
})
