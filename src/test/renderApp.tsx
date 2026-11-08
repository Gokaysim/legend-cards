import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { routes } from '@/app/routes'
import type { AuthState } from '@/features/auth/authContext'

import { testUser } from './fixtures'
import { type TestActivityLog, TestActivityLogProvider } from './TestActivityLogProvider'
import { TestAuthProvider } from './TestAuthProvider'
import { type TestBalances, TestBalancesProvider } from './TestBalancesProvider'
import { type TestCards, TestCardsProvider } from './TestCardsProvider'
import { type TestDraws, TestDrawsProvider } from './TestDrawsProvider'
import { type TestHoldings, TestHoldingsProvider } from './TestHoldingsProvider'
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
}

type Data = {
  users: TestUsers
  cards: TestCards
  holdings: TestHoldings
  balances: TestBalances
  activityLog: TestActivityLog
  draws: TestDraws
}

/**
 * Renders the real route table at `path`, with a fixed auth state (signed in by default), fixed profiles, cards,
 * open holdings, party purse and log records, and fake draws.
 * `setUsers`, `setCards`, `setHoldings`, `setBalances` and `setActivityLog` re-render the same app with other
 * data, as a real-time update would, without remounting.
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
}: RenderAppOptions = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  let current: Data = { users, cards, holdings, balances, activityLog, draws }
  const tree = (data: Data) => (
    <TestAuthProvider state={state} signOut={signOut}>
      <TestUsersProvider {...data.users}>
        <TestBalancesProvider {...data.balances}>
          <TestCardsProvider {...data.cards}>
            <TestHoldingsProvider {...data.holdings}>
              <TestActivityLogProvider {...data.activityLog}>
                <TestDrawsProvider {...data.draws}>
                  <RouterProvider router={router} />
                </TestDrawsProvider>
              </TestActivityLogProvider>
            </TestHoldingsProvider>
          </TestCardsProvider>
        </TestBalancesProvider>
      </TestUsersProvider>
    </TestAuthProvider>
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
  }
}
