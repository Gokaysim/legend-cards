import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { routes } from '@/app/routes'
import type { AuthState } from '@/features/auth/authContext'

import { testUser } from './fixtures'
import { type TestCards, TestCardsProvider } from './TestCardsProvider'
import { TestAuthProvider } from './TestAuthProvider'
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
}

type Data = { users: TestUsers; cards: TestCards; holdings: TestHoldings }

/**
 * Renders the real route table at `path`, with a fixed auth state (signed in by default), fixed profiles, cards
 * and open holdings.
 * `setUsers`, `setCards` and `setHoldings` re-render the same app with other data, as a real-time update would,
 * without remounting.
 */
export function renderApp({
  path = '/',
  state = { status: 'signedIn', user: testUser },
  signOut,
  users = {},
  cards = {},
  holdings = {},
}: RenderAppOptions = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  let current: Data = { users, cards, holdings }
  const tree = (data: Data) => (
    <TestAuthProvider state={state} signOut={signOut}>
      <TestUsersProvider {...data.users}>
        <TestCardsProvider {...data.cards}>
          <TestHoldingsProvider {...data.holdings}>
            <RouterProvider router={router} />
          </TestHoldingsProvider>
        </TestCardsProvider>
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
  }
}
