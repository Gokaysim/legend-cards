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
import { type TestDefinitions, TestDefinitionsProvider } from './TestDefinitionsProvider'
import { type TestDraws, TestDrawsProvider } from './TestDrawsProvider'
import { type TestHoldings, TestHoldingsProvider } from './TestHoldingsProvider'
import { type TestPacks, TestPacksProvider } from './TestPacksProvider'
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
  /** Cards to provide. Defaults to a ready, empty list. */
  cards?: TestCards
  /** Open holdings to provide. Defaults to a ready, empty list. */
  holdings?: TestHoldings
  /** The party purse and the balance changes. Defaults to a missing purse (0 GP). */
  balances?: TestBalances
  /** The İşlem Logu's records. Defaults to none. */
  activityLog?: TestActivityLog
  /** Fake draws. Defaults to draws that give the first candidate. */
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
  /** The built pictures. Defaults to `EMPTY_ART`: every card, back, pack and word keeps its look without pictures. */
  art?: ArtManifest
}

type Data = {
  users: TestUsers
  cards: TestCards
  holdings: TestHoldings
  balances: TestBalances
  activityLog: TestActivityLog
  draws: TestDraws
  table: TestTable
  packs: TestPacks
  trueWords: TestTrueWords
  notes: TestNotes
  definitions: TestDefinitions
  art: ArtManifest | undefined
}

/**
 * Renders the real route table at `path`, with a fixed auth state (signed in by default), fixed profiles, cards,
 * open holdings, party purse, table lock, open pack, True Words, notes, log records and pictures, and fake draws,
 * pack and True Word steps and note saves. `setUsers`, `setCards`, `setHoldings`, `setBalances`, `setTable`,
 * `setPacks`, `setTrueWords`, `setNotes` and `setActivityLog` re-render the same app with other data, as a real-time
 * update would, without remounting.
 */
export function renderApp({
  path = '/',
  state = { status: 'signedIn', user: testUser },
  signOut,
  users = {},
  cards = {},
  holdings = {},
  balances = {},
  activityLog = {},
  draws = {},
  table = {},
  packs = {},
  trueWords = {},
  notes = {},
  definitions = {},
  art,
}: RenderAppOptions = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  let current: Data = {
    users,
    cards,
    holdings,
    balances,
    activityLog,
    draws,
    table,
    packs,
    trueWords,
    notes,
    definitions,
    art,
  }
  const tree = (data: Data) => (
    <TestArtProvider manifest={data.art}>
      <TestAuthProvider state={state} signOut={signOut}>
        <TestUsersProvider {...data.users}>
          <TestBalancesProvider {...data.balances}>
            <TestCardsProvider {...data.cards}>
              <TestHoldingsProvider {...data.holdings}>
                <TestTableProvider {...data.table}>
                  <TestPacksProvider {...data.packs}>
                    <TestActivityLogProvider {...data.activityLog}>
                      <TestDrawsProvider {...data.draws}>
                        <TestTrueWordsProvider {...data.trueWords}>
                          <TestPlayerNotesProvider {...data.notes}>
                            <TestDefinitionsProvider {...data.definitions}>
                              <RouterProvider router={router} />
                            </TestDefinitionsProvider>
                          </TestPlayerNotesProvider>
                        </TestTrueWordsProvider>
                      </TestDrawsProvider>
                    </TestActivityLogProvider>
                  </TestPacksProvider>
                </TestTableProvider>
              </TestHoldingsProvider>
            </TestCardsProvider>
          </TestBalancesProvider>
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
    setCards: (next: TestCards) => update({ cards: next }),
    setHoldings: (next: TestHoldings) => update({ holdings: next }),
    setBalances: (next: TestBalances) => update({ balances: next }),
    setActivityLog: (next: TestActivityLog) => update({ activityLog: next }),
    setTable: (next: TestTable) => update({ table: next }),
    setPacks: (next: TestPacks) => update({ packs: next }),
    setTrueWords: (next: TestTrueWords) => update({ trueWords: next }),
    setNotes: (next: TestNotes) => update({ notes: next }),
  }
}
