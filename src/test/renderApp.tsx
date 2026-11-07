import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { routes } from '@/app/routes'
import type { AuthState } from '@/features/auth/authContext'

import { testUser } from './fixtures'
import { TestAuthProvider } from './TestAuthProvider'
import { type TestUsers, TestUsersProvider } from './TestUsersProvider'

export type RenderAppOptions = {
  path?: string
  state?: AuthState
  signOut?: () => Promise<void>
  /** Profiles to provide. Defaults to `testUser` as a ready player. */
  users?: TestUsers
}

/**
 * Renders the real route table at `path`, with a fixed auth state (signed in by default) and fixed profiles.
 * `setUsers` re-renders the same app with other profiles, as a real-time update would, without remounting.
 */
export function renderApp({
  path = '/',
  state = { status: 'signedIn', user: testUser },
  signOut,
  users = {},
}: RenderAppOptions = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const tree = (current: TestUsers) => (
    <TestAuthProvider state={state} signOut={signOut}>
      <TestUsersProvider {...current}>
        <RouterProvider router={router} />
      </TestUsersProvider>
    </TestAuthProvider>
  )
  const view = render(tree(users))
  const setUsers = (next: TestUsers) => {
    view.rerender(tree(next))
  }
  return { ...view, router, setUsers }
}
