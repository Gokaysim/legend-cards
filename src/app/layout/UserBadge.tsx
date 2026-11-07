import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/authContext'
import { RoleTag } from '@/features/users/RoleTag'
import type { Role } from '@/features/users/schema'
import { useCurrentProfile } from '@/features/users/usersContext'

/** The signed-in user's name, picture and role, with the sign-out action. */
export function UserBadge() {
  const auth = useAuth()
  const profile = useCurrentProfile()
  if (auth.status !== 'signedIn') return null

  const name = auth.user.displayName ?? auth.user.email ?? 'Oyuncu'
  // A profile that does not exist yet is about to be created as a player. While loading, show no role.
  const role: Role | null = profile.status === 'ready' ? (profile.data?.role ?? 'player') : null

  return (
    <section
      aria-label="Giriş yapan kullanıcı"
      className="flex flex-col gap-3 border-t border-line pt-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={name} photoURL={auth.user.photoURL} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-ink" title={name}>
            {name}
          </span>
          {role ? <RoleTag role={role} /> : null}
        </div>
      </div>
      <Button onClick={() => void auth.signOut()}>Çıkış yap</Button>
    </section>
  )
}
