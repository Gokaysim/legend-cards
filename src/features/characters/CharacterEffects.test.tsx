import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { testCard, testCursedCard } from '@/test/cardFixtures'
import { testCharacter, testEffect } from '@/test/characterFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { renderApp } from '@/test/renderApp'
import { testLearnedWord, testTrueWord } from '@/test/trueWordFixtures'

import type { CharacterActions } from './charactersContext'
import type { CharacterEffect } from './effects'

// The effects on the Karakterler tab (spec: character-effects): the counts on the character tabs, the "Aktif efektler"
// list in the selected character's view, removing and adding.

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Whose hand is shown: the signed-in player's own ("me"), or Ayla's, seen by the signed-in player or the DM. */
type Viewer = 'owner' | 'player' | 'dm'

const OWNER = 'ayla'
const devilsPride = testCursedCard("Devil's Pride", { text: 'Held: no Natural 20 [note].' })
const nightOwl = testCard('Night Owl')
const abyss = testTrueWord('Abyss', { text: 'Abyss word.' })

function setup({
  viewer = 'owner',
  effects = () => [],
  heldActive = false,
  wordActive = false,
}: {
  viewer?: Viewer
  effects?: (ownerId: string, thorinId: string) => CharacterEffect[]
  heldActive?: boolean
  wordActive?: boolean
} = {}) {
  const ownerId = viewer === 'owner' ? testUser.uid : OWNER
  const me = testProfile({
    displayName: viewer === 'dm' ? 'Dana' : 'Gökay',
    role: viewer === 'dm' ? 'dm' : 'player',
  })
  const owner = testProfile({ id: OWNER, displayName: 'Ayla' })
  const thorin = testCharacter('Thorin', ownerId, { addedAtMillis: 1000 })
  const kuzgun = testCharacter('Kuzgun', ownerId, { addedAtMillis: 2000 })
  const fakes: CharacterActions = {
    addCharacter: vi.fn(() => Promise.resolve('x')),
    saveCharacter: vi.fn(() => Promise.resolve()),
    setCharacterArchived: vi.fn(() => Promise.resolve()),
    addEffect: vi.fn(() => Promise.resolve()),
    removeEffect: vi.fn(() => Promise.resolve()),
  }
  const view = renderApp({
    path: `/hands/${ownerId}?tab=characters`,
    users: { currentProfile: ready(me), profiles: ready([me, owner]) },
    cards: { cards: ready([devilsPride, nightOwl]) },
    holdings: {
      openHoldings: ready([
        testHolding(devilsPride, ownerId, 1000, { id: 'h-devil', active: heldActive }),
        testHolding(nightOwl, ownerId, 2000, { id: 'h-owl', active: false }),
      ]),
    },
    trueWords: {
      words: ready([abyss]),
      knownWords: ready([testLearnedWord('r-abyss', abyss, ownerId, { active: wordActive })]),
    },
    characters: {
      characters: ready([thorin, kuzgun]),
      effects: ready(effects(ownerId, thorin.id)),
      actions: fakes,
    },
  })
  return { ...view, fakes, thorin, kuzgun, user: userEvent.setup(), ownerId }
}

const main = () => within(screen.getByRole('main'))
const tab = (name: string) => main().getByRole('tab', { name: new RegExp(`^${name}`) })
/** The view of Thorin, the character every test looks at. */
const panel = () => within(main().getByRole('tabpanel', { name: /^Thorin/ }))
const effectsList = () => within(panel().getByRole('region', { name: 'Aktif efektler' }))

async function select(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(tab(name))
}

describe("the effect count on a character's tab", () => {
  it('counts stored effects and the held card, which shows on every character', () => {
    setup({
      heldActive: true,
      effects: (uid, thorinId) => [testEffect('Kutsal su', { id: thorinId, uid })],
    })

    expect(tab('Thorin')).toHaveAccessibleName('Thorin, 2 aktif efekt')
    expect(tab('Kuzgun')).toHaveAccessibleName('Kuzgun, 1 aktif efekt')
  })

  it('shows no count without effects', () => {
    setup()

    expect(tab('Thorin')).toHaveAccessibleName('Thorin')
    expect(tab('Thorin').querySelector('[data-effect-count]')).toBeNull()
  })

  it('changes without a reload', () => {
    const view = setup()

    view.setCharacters({
      characters: ready([view.thorin, view.kuzgun]),
      effects: ready([testEffect('Kutsal su', view.thorin)]),
    })

    expect(tab('Thorin')).toHaveAccessibleName('Thorin, 1 aktif efekt')
  })
})

describe('the active effects in the details', () => {
  it('lists the held card, then the active word, then the stored effects, newest first', async () => {
    const { user } = setup({
      heldActive: true,
      wordActive: true,
      effects: (uid, thorinId) => [
        testEffect(
          "Lord Vulfric's Valour",
          { id: thorinId, uid },
          {
            source: 'card',
            sourceId: 'h-old',
            addedAtMillis: 1000,
          },
        ),
        testEffect(
          'Kutsanmış kalkan',
          { id: thorinId, uid },
          {
            source: 'dm',
            createdBy: testUser.uid,
            addedAtMillis: 5000,
          },
        ),
      ],
    })

    await select(user, 'Thorin')

    const rows = effectsList().getAllByRole('listitem')
    expect(rows.map((row) => within(row).getAllByText(/./)[0]?.textContent)).toEqual([
      'Elden',
      'True Word',
      'DM',
      'Kart',
    ])
    expect(within(rows[0] as HTMLElement).getByText("Devil's Pride")).toBeInTheDocument()
    expect(rows[0]).toHaveTextContent('Cursed:')
    expect(within(rows[0] as HTMLElement).getByText('Held: no Natural 20 .')).toBeInTheDocument()
    expect(within(rows[1] as HTMLElement).getByText('Abyss')).toBeInTheDocument()
  })

  it('shows who added a stored effect and when', async () => {
    const { user } = setup({
      effects: (uid, thorinId) => [
        testEffect(
          'Kutsal su',
          { id: thorinId, uid },
          { addedAtMillis: Date.UTC(2026, 10, 14, 15, 6) },
        ),
      ],
    })

    await select(user, 'Thorin')

    expect(effectsList().getByText(/^Gökay · 14 Kas/)).toBeInTheDocument()
  })

  it('says so without effects', async () => {
    const { user } = setup()

    await select(user, 'Thorin')

    expect(effectsList().getByText('Aktif efekt yok.')).toBeInTheDocument()
  })
})

describe('removing an effect', () => {
  const kinds = (uid: string, thorinId: string): CharacterEffect[] => [
    testEffect(
      'Card fx',
      { id: thorinId, uid },
      { source: 'card', sourceId: 'h1', createdBy: 'bora' },
    ),
    testEffect('Own fx', { id: thorinId, uid }),
    testEffect('DM fx', { id: thorinId, uid }, { source: 'dm', createdBy: 'dana' }),
  ]
  const removable = () =>
    effectsList()
      .queryAllByRole('button', { name: /efektini kaldır$/ })
      .map((button) => button.getAttribute('aria-label'))

  it.each([
    ['the owner', 'owner', ['Card fx efektini kaldır', 'Own fx efektini kaldır']],
    ['another player', 'player', []],
    [
      'the DM',
      'dm',
      ['Card fx efektini kaldır', 'Own fx efektini kaldır', 'DM fx efektini kaldır'],
    ],
  ] as const)('offers Kaldır to %s only where allowed', async (_case, viewer, expected) => {
    const { user } = setup({ viewer, effects: kinds })

    await select(user, 'Thorin')

    expect(removable().sort()).toEqual([...expected].sort())
  })

  it('offers Kaldır on a card effect to the user who used the card', async () => {
    const { user } = setup({
      viewer: 'player',
      effects: (uid, thorinId) => [
        testEffect(
          'Mine',
          { id: thorinId, uid },
          { source: 'card', sourceId: 'h1', createdBy: testUser.uid },
        ),
      ],
    })

    await select(user, 'Thorin')

    expect(removable()).toEqual(['Mine efektini kaldır'])
  })

  it('deletes the effect, and reports a failure', async () => {
    const { user, fakes } = setup({ effects: kinds })
    vi.mocked(fakes.removeEffect).mockRejectedValueOnce(
      Object.assign(new Error('x'), { code: 'permission-denied' }),
    )

    await select(user, 'Thorin')
    await user.click(effectsList().getByRole('button', { name: 'Own fx efektini kaldır' }))

    expect(fakes.removeEffect).toHaveBeenCalledWith('fx-Ownfx')
    expect(await panel().findByRole('alert')).toHaveTextContent('Bu işlem için yetkin yok.')
  })
})

describe('adding an effect', () => {
  it.each([
    ['the owner', 'owner', false],
    ['the DM', 'dm', true],
  ] as const)('lets %s add one, closing at once', async (_case, viewer, isDm) => {
    const { user, fakes, thorin } = setup({ viewer })

    await select(user, 'Thorin')
    await user.click(effectsList().getByRole('button', { name: '+ Efekt ekle' }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText('Ad'), 'Kutsal su')
    await user.type(dialog.getByLabelText('Metin'), '+1 to saves until dawn.')
    await user.click(dialog.getByRole('button', { name: 'Kaydet' }))

    expect(fakes.addEffect).toHaveBeenCalledWith({
      character: thorin,
      name: 'Kutsal su',
      text: '+1 to saves until dawn.',
      by: testUser.uid,
      isDm,
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('asks for a name and a text', async () => {
    const { user, fakes } = setup()

    await select(user, 'Thorin')
    await user.click(effectsList().getByRole('button', { name: '+ Efekt ekle' }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText('Ad'), '   ')
    await user.click(dialog.getByRole('button', { name: 'Kaydet' }))

    expect(dialog.getByRole('alert')).toHaveTextContent('Efektin bir adı olmalı.')
    expect(dialog.getByRole('alert')).toHaveTextContent('Efektin bir metni olmalı.')
    expect(fakes.addEffect).not.toHaveBeenCalled()
  })

  it("offers no + Efekt ekle on another player's character", async () => {
    const { user } = setup({ viewer: 'player' })

    await select(user, 'Thorin')

    expect(effectsList().queryByRole('button', { name: '+ Efekt ekle' })).not.toBeInTheDocument()
  })
})
