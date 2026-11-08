import { useId } from 'react'
import { NavLink } from 'react-router'

import { handPath } from '@/app/screens'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'
import type { Subscription } from '@/lib/firestore/subscription'

import { RoleTag } from './RoleTag'
import type { UserProfile } from './schema'
import { profileName } from './usersContext'

export type PlayerListProps = {
  /** Every profile, already sorted (see `useProfiles`). */
  profiles: Subscription<UserProfile[]>
  /** Called after the user picks a name, so the mobile menu can close. */
  onNavigate?: () => void
}

/**
 * The "Oyuncular" list: everyone who has signed up, with the DM marked. Each name opens that user's hand, and the
 * user whose hand is shown is marked (`aria-current`).
 */
export function PlayerList({ profiles, onNavigate }: PlayerListProps) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2
        id={headingId}
        className="px-3 text-xs font-semibold tracking-wide text-ink-muted uppercase"
      >
        Oyuncular
      </h2>
      {profiles.status === 'loading' ? (
        <p role="status" className="px-3 text-sm text-ink-muted">
          Oyuncular yükleniyor…
        </p>
      ) : profiles.status === 'error' ? (
        <p role="alert" className="px-3 text-sm text-danger-ink">
          Oyuncu listesi yüklenemedi.
        </p>
      ) : profiles.data.length === 0 ? (
        <p className="px-3 text-sm text-ink-muted">Henüz oyuncu yok</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {profiles.data.map((profile) => (
            <li key={profile.id}>
              <NavLink
                to={handPath(profile.id)}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex min-w-0 items-center gap-2 rounded-lg px-3 py-1 text-sm text-ink transition-colors hover:bg-pane-raised',
                    isActive && 'bg-pane-raised font-semibold text-gold',
                  )
                }
              >
                <Avatar name={profileName(profile)} photoURL={profile.photoURL} size="sm" />
                <span className="truncate">{profileName(profile)}</span>
                {profile.role === 'dm' ? <RoleTag role="dm" /> : null}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
