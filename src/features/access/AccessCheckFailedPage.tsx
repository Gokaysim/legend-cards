import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/authContext'

/**
 * The screen after every try to check the access list failed (spec: user-auth, "Access check failure screen"; design
 * D4 of retry-own-access-check). A failed check is never "ekli değil": the account may well be on the list, so the
 * screen offers to check again instead of sending the person to the DM. The app reads no table data meanwhile.
 */
export function AccessCheckFailedPage() {
  const auth = useAuth()
  const email = auth.status === 'checkFailed' ? auth.user.email : null

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <section className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-line bg-pane p-8 text-center">
        <h1 className="text-3xl font-semibold text-gold">✦ Legend Cards</h1>
        <p className="text-sm text-ink">
          {email ? (
            <>
              <strong className="font-semibold break-all">{email}</strong> için masaya erişim şu an
              kontrol edilemedi.
            </>
          ) : (
            'Masaya erişim şu an kontrol edilemedi.'
          )}{' '}
          Bağlantını kontrol edip tekrar dene.
        </p>
        <div className="flex w-full flex-col gap-2">
          <Button variant="primary" className="w-full py-3" onClick={auth.retryAccessCheck}>
            Tekrar dene
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => void auth.signOut()}>
            Çıkış yap
          </Button>
        </div>
      </section>
    </main>
  )
}
