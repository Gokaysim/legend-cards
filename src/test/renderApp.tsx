import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { routes } from '@/app/routes'
import type { AuthState } from '@/features/auth/authContext'

import { testUser } from './fixtures'
import { type TestCards, TestCardsProvider } from './TestCardsProvider'
import { TestAuthProvider } from './TestAuthProvider'
import { type TestUsers, TestUsersProvider } from './TestUsersProvider'

export type RenderAppOptions = {
  path?: string
  state?: AuthState
  signOut?: () => Promise<void>
  /** Profiles to provide. Defaults to `testUser` as a ready player. */
  users?: TestUsers
  /** Cards to provide. Defaults to a ready, empty list. */
  cards?: TestCards
}

/**
 * Renders the real route table at `path`, with a fixed auth state (signed in by default), fixed profiles and
 * fixed cards.
 * `setUsers` re-renders the same app with other profiles, as a real-time update would, without remounting.
 */
export function renderApp({
  path = '/',
  state = { status: 'signedIn', user: testUser },
  signOut,
  users = {},
  cards = {},
}: RenderAppOptions = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const tree = (current: TestUsers) => (
    <TestAuthProvider state={state} signOut={signOut}>
      <TestUsersProvider {...current}>
        <TestCardsProvider {...cards}>
          <RouterProvider router={router} />
        </TestCardsProvider>
      </TestUsersProvider>
    </TestAuthProvider>
  )
  const view = render(tree(users))
  const setUsers = (next: TestUsers) => {
    view.rerender(tree(next))
  }
  return { ...view, router, setUsers }
}
