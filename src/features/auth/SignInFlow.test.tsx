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

function renderAt(
  initialPath: string,
  state: AuthState,
  signInWithGoogle?: () => Promise<void>,
  signOut?: () => Promise<void>,
  retryAccessCheck?: () => void,
) {
  const router = createRouter(initialPath)
  const provide = (current: AuthState) => (
    <TestAuthProvider
      state={current}
      signInWithGoogle={signInWithGoogle}
      signOut={signOut}
      retryAccessCheck={retryAccessCheck}
    >
      <RouterProvider router={router} />
    </TestAuthProvider>
  )
  const view = render(provide(state))
  const setAuth = (next: AuthState) => view.rerender(provide(next))
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

describe('accounts that are not on the access list', () => {
  const noAccess: AuthState = { status: 'noAccess', user: testUser }
  const otherAccountButton = () => screen.getByRole('button', { name: 'Başka hesapla giriş yap' })

  it('shows only a loading state while the access list is checked', () => {
    renderAt('/library', { status: 'checking', user: testUser })

    expect(screen.getByRole('status')).toHaveTextContent('Yükleniyor')
    expect(screen.queryByText(/ekli değil/)).not.toBeInTheDocument()
    expect(screen.queryByText('Kütüphane ekranı')).not.toBeInTheDocument()
  })

  it('shows the "ekli değil" screen with the address, instead of the screen asked for', () => {
    const { router } = renderAt('/library', noAccess)

    expect(screen.getByText(testUser.email ?? '')).toBeInTheDocument()
    expect(
      screen.getByText(/bu masaya ekli değil\. DM'den bu adresi eklemesini iste\./),
    ).toBeInTheDocument()
    expect(screen.queryByText('Kütüphane ekranı')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/library')
  })

  it('shows the screen after a sign-in from the sign-in screen, and enters at the address first asked for once the DM adds the account', async () => {
    const user = userEvent.setup()
    const { router, setAuth } = renderAt('/library', { status: 'signedOut' })

    await user.click(signInButton())
    setAuth(noAccess)
    expect(otherAccountButton()).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')

    setAuth({ status: 'signedIn', user: testUser })
    expect(await screen.findByText('Kütüphane ekranı')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/library')
  })

  it('enters without a reload when the DM adds the address while the screen is open', async () => {
    const { setAuth } = renderAt('/library', noAccess)

    setAuth({ status: 'signedIn', user: testUser })
    expect(await screen.findByText('Kütüphane ekranı')).toBeInTheDocument()
  })

  it('moves a player whose address is removed to the screen, with no error message', () => {
    const { setAuth } = renderAt('/library', { status: 'signedIn', user: testUser })
    expect(screen.getByText('Kütüphane ekranı')).toBeInTheDocument()

    setAuth(noAccess)
    expect(otherAccountButton()).toBeInTheDocument()
    expect(screen.queryByText('Kütüphane ekranı')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('opens the account chooser for another account, which enters when it is on the list', async () => {
    const user = userEvent.setup()
    const signIn = vi.fn(() => Promise.resolve())
    const { setAuth } = renderAt('/library', noAccess, signIn)

    await user.click(otherAccountButton())
    expect(signIn).toHaveBeenCalledTimes(1)
    setAuth({ status: 'signedIn', user: { ...testUser, email: 'other@example.com' } })
    expect(await screen.findByText('Kütüphane ekranı')).toBeInTheDocument()
  })

  it('shows no error when the Google window is closed, and a Turkish one when it fails', async () => {
    const user = userEvent.setup()
    const cancelled = Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' })
    const failure = Object.assign(new Error('offline'), { code: 'auth/network-request-failed' })
    const signIn = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(cancelled)
      .mockRejectedValueOnce(failure)
    renderAt('/library', noAccess, signIn)

    await user.click(otherAccountButton())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(otherAccountButton())
    expect(screen.getByRole('alert')).toHaveTextContent('Bağlantı kurulamadı')
    expect(otherAccountButton()).toBeEnabled()
  })

  it('signs out, which shows the sign-in screen', async () => {
    const user = userEvent.setup()
    const signOut = vi.fn(() => Promise.resolve())
    const { setAuth } = renderAt('/library', noAccess, undefined, signOut)

    await user.click(screen.getByRole('button', { name: 'Çıkış yap' }))
    expect(signOut).toHaveBeenCalledTimes(1)
    setAuth({ status: 'signedOut' })
    expect(signInButton()).toBeInTheDocument()
  })
})

// Spec: user-auth, "Access check failure screen" and "The 'ekli değil' screen" (retry-own-access-check).
describe('a failed access check', () => {
  const checkFailed: AuthState = { status: 'checkFailed', user: testUser }
  const retryButton = () => screen.getByRole('button', { name: 'Tekrar dene' })

  it('shows the address and says access could not be checked, never "ekli değil"', () => {
    const { router } = renderAt('/library', checkFailed)

    expect(screen.getByText(testUser.email ?? '')).toBeInTheDocument()
    expect(screen.getByText(/için masaya erişim şu an kontrol edilemedi\./)).toBeInTheDocument()
    expect(retryButton()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Çıkış yap' })).toBeInTheDocument()
    expect(screen.queryByText(/ekli değil/)).not.toBeInTheDocument()
    expect(screen.queryByText('Kütüphane ekranı')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/library')
  })

  it('shows the screen after a sign-in from the sign-in screen too', () => {
    renderAt('/sign-in', checkFailed)

    expect(retryButton()).toBeInTheDocument()
    expect(screen.queryByText(/ekli değil/)).not.toBeInTheDocument()
  })

  it('checks again on "Tekrar dene", shows the loading state, and enters at the screen asked for', async () => {
    const user = userEvent.setup()
    const retry = vi.fn()
    const { router, setAuth } = renderAt('/library', checkFailed, undefined, undefined, retry)

    await user.click(retryButton())
    expect(retry).toHaveBeenCalledTimes(1)

    setAuth({ status: 'checking', user: testUser })
    expect(screen.getByRole('status')).toHaveTextContent('Yükleniyor')

    setAuth({ status: 'signedIn', user: testUser })
    expect(await screen.findByText('Kütüphane ekranı')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/library')
  })

  it('signs out, which shows the sign-in screen', async () => {
    const user = userEvent.setup()
    const signOut = vi.fn(() => Promise.resolve())
    const { setAuth } = renderAt('/library', checkFailed, undefined, signOut)

    await user.click(screen.getByRole('button', { name: 'Çıkış yap' }))
    expect(signOut).toHaveBeenCalledTimes(1)
    setAuth({ status: 'signedOut' })
    expect(signInButton()).toBeInTheDocument()
  })
})
