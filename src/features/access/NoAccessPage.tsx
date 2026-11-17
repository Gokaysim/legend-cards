import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/authContext'
import { authErrorMessage } from '@/features/auth/authErrors'

import { diagnosisLine } from './accessDiagnosis'

/**
 * The "ekli değil" screen (spec: user-auth, "The 'ekli değil' screen"): an account that signed in to Google but is
 * not on the DM's access list. It names the address, so the person can tell the DM which one to add. The session
 * stays open, so the app lets the person in without a reload once the DM adds the address. A muted line at the bottom
 * says why the app decided so (spec: user-auth, "Diagnosing the 'ekli değil' decision").
 */
export function NoAccessPage() {
  const auth = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const email = auth.status === 'noAccess' ? auth.user.email : null
  const diagnosis = auth.status === 'noAccess' ? auth.diagnosis : undefined

  async function handleOtherAccount() {
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
        <h1 className="text-3xl font-semibold text-gold">✦ Legend Cards</h1>
        <p className="text-sm text-ink">
          {email ? (
            <>
              <strong className="font-semibold break-all">{email}</strong> bu masaya ekli değil.
            </>
          ) : (
            'Bu Google hesabı bu masaya ekli değil.'
          )}{' '}
          DM&apos;den bu adresi eklemesini iste.
        </p>
        <div className="flex w-full flex-col gap-2">
          <Button
            variant="primary"
            className="w-full py-3"
            onClick={() => void handleOtherAccount()}
            disabled={isSigningIn}
          >
            {isSigningIn ? 'Giriş yapılıyor…' : 'Başka hesapla giriş yap'}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => void auth.signOut()}>
            Çıkış yap
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger-ink">
            {error}
          </p>
        ) : null}
        {diagnosis ? (
          // What the app decided and why, small and muted, for a screenshot (design D4 of diagnose-no-access).
          <p className="w-full font-mono text-xs break-words text-ink-muted">
            {diagnosisLine(diagnosis)}
          </p>
        ) : null}
      </section>
    </main>
  )
}
