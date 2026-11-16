import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { routes } from '@/app/routes'
import type { ArtManifest } from '@/features/art/schema'
import type { AuthState } from '@/features/auth/authContext'

import { testUser } from './fixtures'
import { type TestActivityLog, TestActivityLogProvider } from './TestActivityLogProvider'
import { TestArtProvider } from './TestArtProvider'
import { TestAuthProvider } from './TestAuthProvider'
import { type TestBalances, TestBalancesProvider } from './TestBalancesProvider'
import { type TestCards, TestCardsProvider } from './TestCardsProvider'
import { type TestCharacters, TestCharactersProvider } from './TestCharactersProvider'
import { type TestCombat, TestCombatProvider } from './TestCombatProvider'
import { type TestDefinitions, TestDefinitionsProvider } from './TestDefinitionsProvider'
import { type TestDice, TestDiceProvider } from './TestDiceProvider'
import { type TestDraws, TestDrawsProvider } from './TestDrawsProvider'
import { type TestHoldings, TestHoldingsProvider } from './TestHoldingsProvider'
import { type TestPacks, TestPacksProvider } from './TestPacksProvider'
import { type TestSets, TestSetsProvider } from './TestSetsProvider'
import { type TestStats, TestStatsProvider } from './TestStatsProvider'
import { type TestNotes, TestPlayerNotesProvider } from './TestPlayerNotesProvider'
import { type TestTable, TestTableProvider } from './TestTableProvider'
import { type TestTrueWords, TestTrueWordsProvider } from './TestTrueWordsProvider'
import { type TestUsers, TestUsersProvider } from './TestUsersProvider'

export type RenderAppOptions = {
  path?: string
  state?: AuthState
  signOut?: () => Promise<void>
  /** Profiles to provide. Defaults to `testUser` as a ready player. */
  users?: TestUsers
  /** The characters and fake character steps. Defaults to none, and steps that succeed. */
  characters?: TestCharacters
  /** The stored sets and fake set steps. Defaults to the 12 sets of `data/sets.csv`, without pictures. */
  sets?: TestSets
  /** Cards to provide. Defaults to a ready, empty list. */
  cards?: TestCards
  /** Open holdings to provide. Defaults to a ready, empty list. */
  holdings?: TestHoldings
  /** The party purse and the balance changes. Defaults to a missing purse (0 GP). */
  balances?: TestBalances
  /** The İşlem Logu's records. Defaults to none. */
  activityLog?: TestActivityLog
  /** The records of the Kart geçmişi and Set istatistikleri pages. Defaults to none. */
  stats?: TestStats
  /** Fake draws and the draw sessions. Defaults to draws that give the first candidate, and no sessions. */
  draws?: TestDraws
  /** The table's lock. Defaults to a free table. */
  table?: TestTable
  /** The open pack and fake pack steps. Defaults to no pack, and steps that succeed. */
  packs?: TestPacks
  /** The words, known words, open drafts and fake True Word steps. Defaults to none, and steps that succeed. */
  trueWords?: TestTrueWords
  /** The player notes and DM notes, and fake saves. Defaults to no notes, and saves that succeed. */
  notes?: TestNotes
  /** Fake definition steps. Defaults to steps that succeed. */
  definitions?: TestDefinitions
  /** The dice channel, the roll to play and fake dice steps. Defaults to no rolls, and steps that succeed. */
  dice?: TestDice
  /** The combat, the NPCs' rolls (a DM's device only) and fake combat steps. Defaults to none, and steps that succeed. */
  combat?: TestCombat
  /** The built pictures. Defaults to `EMPTY_ART`: every card, back, pack and word keeps its look without pictures. */
  art?: ArtManifest
}

type Data = {
  users: TestUsers
  characters: TestCharacters
  sets: TestSets
  cards: TestCards
  holdings: TestHoldings
  balances: TestBalances
  activityLog: TestActivityLog
  stats: TestStats
  draws: TestDraws
  table: TestTable
  packs: TestPacks
  trueWords: TestTrueWords
  notes: TestNotes
  definitions: TestDefinitions
  dice: TestDice
  combat: TestCombat
  art: ArtManifest | undefined
}

/**
 * Renders the real route table at `path`, with a fixed auth state (signed in by default), fixed profiles, characters,
 * sets, cards, open holdings, party purse, table lock, open pack, True Words, notes, log and statistics records and
 * pictures, and fake draws, pack, set, character and True Word steps and note saves. `setUsers`, `setCharacters`,
 * `setSets`, `setCards`, `setHoldings`, `setBalances`, `setTable`, `setPacks`, `setTrueWords`, `setNotes`,
 * `setActivityLog`, `setStats`, `setDraws`, `setDice` and `setCombat` re-render the same app with other data, as a real-time update would, without
 * remounting.
 */
export function renderApp({
  path = '/',
  state = { status: 'signedIn', user: testUser },
  signOut,
  users = {},
  characters = {},
  sets = {},
  cards = {},
  holdings = {},
  balances = {},
  activityLog = {},
  stats = {},
  draws = {},
  table = {},
  packs = {},
  trueWords = {},
  notes = {},
  definitions = {},
  dice = {},
  combat = {},
  art,
}: RenderAppOptions = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  let current: Data = {
    users,
    characters,
    sets,
    cards,
    holdings,
    balances,
    activityLog,
    stats,
    draws,
    table,
    packs,
    trueWords,
    notes,
    definitions,
    dice,
    combat,
    art,
  }
  const tree = (data: Data) => (
    <TestArtProvider manifest={data.art}>
      <TestAuthProvider state={state} signOut={signOut}>
        <TestUsersProvider {...data.users}>
          <TestCharactersProvider {...data.characters}>
            <TestBalancesProvider {...data.balances}>
              <TestSetsProvider {...data.sets}>
                <TestCardsProvider {...data.cards}>
                  <TestHoldingsProvider {...data.holdings}>
                    <TestTableProvider {...data.table}>
                      <TestPacksProvider {...data.packs}>
                        <TestActivityLogProvider {...data.activityLog}>
                          <TestStatsProvider {...data.stats}>
                            <TestDrawsProvider {...data.draws}>
                              <TestTrueWordsProvider {...data.trueWords}>
                                <TestPlayerNotesProvider {...data.notes}>
                                  <TestDefinitionsProvider {...data.definitions}>
                                    <TestDiceProvider {...data.dice}>
                                      <TestCombatProvider {...data.combat}>
                                        <RouterProvider router={router} />
                                      </TestCombatProvider>
                                    </TestDiceProvider>
                                  </TestDefinitionsProvider>
                                </TestPlayerNotesProvider>
                              </TestTrueWordsProvider>
                            </TestDrawsProvider>
                          </TestStatsProvider>
                        </TestActivityLogProvider>
                      </TestPacksProvider>
                    </TestTableProvider>
                  </TestHoldingsProvider>
                </TestCardsProvider>
              </TestSetsProvider>
            </TestBalancesProvider>
          </TestCharactersProvider>
        </TestUsersProvider>
      </TestAuthProvider>
    </TestArtProvider>
  )
  const view = render(tree(current))
  const update = (next: Partial<Data>) => {
    current = { ...current, ...next }
    view.rerender(tree(current))
  }
  return {
    ...view,
    router,
    setUsers: (next: TestUsers) => update({ users: next }),
    setCharacters: (next: TestCharacters) => update({ characters: next }),
    setSets: (next: TestSets) => update({ sets: next }),
    setCards: (next: TestCards) => update({ cards: next }),
    setHoldings: (next: TestHoldings) => update({ holdings: next }),
    setBalances: (next: TestBalances) => update({ balances: next }),
    setActivityLog: (next: TestActivityLog) => update({ activityLog: next }),
    setStats: (next: TestStats) => update({ stats: next }),
    setTable: (next: TestTable) => update({ table: next }),
    setPacks: (next: TestPacks) => update({ packs: next }),
    setTrueWords: (next: TestTrueWords) => update({ trueWords: next }),
    setNotes: (next: TestNotes) => update({ notes: next }),
    setDraws: (next: TestDraws) => update({ draws: next }),
    setDice: (next: TestDice) => update({ dice: next }),
    setCombat: (next: TestCombat) => update({ combat: next }),
  }
}
