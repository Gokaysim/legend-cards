import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { testUser } from '@/test/fixtures'
import { TestAuthProvider } from '@/test/TestAuthProvider'

import type { AuthState } from './authContext'
import { RequireAuth } from './RequireAuth'
import { SignInPage } from './SignInPage'

function createRouter(initialPath: string) {
  return createMemoryRouter(
    [
      { path: '/sign-in', element: <SignInPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: '/hands', element: <p>Oyuncu elleri ekranı</p> },
          { path: '/library', element: <p>Kütüphane ekranı</p> },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  )
}

function renderAt(initialPath: string, state: AuthState, signInWithGoogle?: () => Promise<void>) {
  const router = createRouter(initialPath)
  const view = render(
    <TestAuthProvider state={state} signInWithGoogle={signInWithGoogle}>
      <RouterProvider router={router} />
    </TestAuthProvider>,
  )
  const setAuth = (next: AuthState) =>
    view.rerender(
      <TestAuthProvider state={next} signInWithGoogle={signInWithGoogle}>
        <RouterProvider router={router} />
      </TestAuthProvider>,
    )
  return { router, setAuth }
}

const signInButton = () => screen.getByRole('button', { name: 'Google ile giriş yap' })

describe('sign-in flow', () => {
  it('shows only a loading state while the session is restored', () => {
    renderAt('/library', { status: 'loading' })

    expect(screen.getByRole('status')).toHaveTextContent('Yükleniyor')
    expect(screen.queryByRole('button', { name: 'Google ile giriş yap' })).not.toBeInTheDocument()
    expect(screen.queryByText('Kütüphane ekranı')).not.toBeInTheDocument()
  })

  it('sends a signed-out user from a protected screen to the sign-in screen', () => {
    const { router } = renderAt('/library', { status: 'signedOut' })

    expect(signInButton()).toBeInTheDocument()
    expect(screen.queryByText('Kütüphane ekranı')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
  })

  it('returns the user to the screen they asked for after signing in', async () => {
    const user = userEvent.setup()
    const signIn = vi.fn(() => Promise.resolve())
    const { router, setAuth } = renderAt('/library', { status: 'signedOut' }, signIn)

    await user.click(signInButton())
    expect(signIn).toHaveBeenCalledTimes(1)
    setAuth({ status: 'signedIn', user: testUser })

    expect(await screen.findByText('Kütüphane ekranı')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/library')
  })

  it('sends a signed-in user who opens the sign-in screen to the default screen', async () => {
    const { router } = renderAt('/sign-in', { status: 'signedIn', user: testUser })

    expect(await screen.findByText('Oyuncu elleri ekranı')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/hands')
  })

  it('shows no error when the user closes the Google window', async () => {
    const user = userEvent.setup()
    const cancelled = Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' })
    renderAt('/sign-in', { status: 'signedOut' }, () => Promise.reject(cancelled))

    await user.click(signInButton())

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(signInButton()).toBeEnabled()
  })

  it('shows a Turkish error when sign-in fails, and allows another try', async () => {
    const user = userEvent.setup()
    const failure = Object.assign(new Error('offline'), { code: 'auth/network-request-failed' })
    renderAt('/sign-in', { status: 'signedOut' }, () => Promise.reject(failure))

    await user.click(signInButton())

    expect(screen.getByRole('alert')).toHaveTextContent('Bağlantı kurulamadı')
    expect(signInButton()).toBeEnabled()
  })
})
