import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { routes } from '@/app/routes'
import type { AuthState } from '@/features/auth/authContext'

import { testUser } from './fixtures'
import { TestAuthProvider } from './TestAuthProvider'

export type RenderAppOptions = {
  path?: string
  state?: AuthState
  signOut?: () => Promise<void>
}

/** Renders the real route table at `path`, with a fixed auth state (signed in by default). */
export function renderApp({
  path = '/',
  state = { status: 'signedIn', user: testUser },
  signOut,
}: RenderAppOptions = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const view = render(
    <TestAuthProvider state={state} signOut={signOut}>
      <RouterProvider router={router} />
    </TestAuthProvider>,
  )
  return { ...view, router }
}
