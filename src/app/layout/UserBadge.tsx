import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/authContext'

/** The signed-in user's name and picture, with the sign-out action. */
export function UserBadge() {
  const auth = useAuth()
  if (auth.status !== 'signedIn') return null

  const name = auth.user.displayName ?? auth.user.email ?? 'Oyuncu'

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <div className="flex min-w-0 items-center gap-3">
        {auth.user.photoURL ? (
          <img
            src={auth.user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="size-9 shrink-0 rounded-full border border-line"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-pane-raised text-sm font-semibold text-gold"
          >
            {name.charAt(0).toLocaleUpperCase('tr')}
          </span>
        )}
        <span className="truncate text-sm text-ink" title={name}>
          {name}
        </span>
      </div>
      <Button onClick={() => void auth.signOut()}>Çıkış yap</Button>
    </div>
  )
}
