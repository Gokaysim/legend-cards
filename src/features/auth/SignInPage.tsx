import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'

import { Button } from '@/components/ui/Button'
import { FullScreenSpinner } from '@/components/ui/FullScreenSpinner'
import { AccessCheckFailedPage } from '@/features/access/AccessCheckFailedPage'
import { NoAccessPage } from '@/features/access/NoAccessPage'

import { useAuth } from './authContext'
import { authErrorMessage } from './authErrors'
import { SIGN_IN_PATH } from './RequireAuth'

const DEFAULT_PATH = '/hands'

/** The address the user first asked for, passed along by `RequireAuth`. */
function returnPath(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) return DEFAULT_PATH
  const from: unknown = state.from
  if (typeof from !== 'object' || from === null || !('pathname' in from)) return DEFAULT_PATH
  const { pathname, search, hash } = from as { pathname: unknown; search?: unknown; hash?: unknown }
  if (typeof pathname !== 'string' || pathname === SIGN_IN_PATH) return DEFAULT_PATH
  return `${pathname}${typeof search === 'string' ? search : ''}${typeof hash === 'string' ? hash : ''}`
}

export function SignInPage() {
  const auth = useAuth()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  if (auth.status === 'loading' || auth.status === 'checking') return <FullScreenSpinner />
  if (auth.status === 'noAccess') return <NoAccessPage />
  if (auth.status === 'checkFailed') return <AccessCheckFailedPage />
  if (auth.status === 'signedIn') return <Navigate to={returnPath(location.state)} replace />

  async function handleSignIn() {
    setError(null)
    setIsSigningIn(true)
    try {
      await auth.signInWithGoogle()
    } catch (signInError) {
      setError(authErrorMessage(signInError))
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <section className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-line bg-pane p-8 text-center">
        <div>
          <h1 className="text-3xl font-semibold text-gold">✦ Legend Cards</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Masadaki kartları, Legend Point&apos;leri ve True Words&apos;ü takip et.
          </p>
        </div>
        <Button
          variant="primary"
          className="w-full py-3"
          onClick={() => void handleSignIn()}
          disabled={isSigningIn}
        >
          {isSigningIn ? 'Giriş yapılıyor…' : 'Google ile giriş yap'}
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-danger-ink">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  )
}
