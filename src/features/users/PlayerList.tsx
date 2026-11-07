import { useId } from 'react'

import { Avatar } from '@/components/ui/Avatar'
import type { Subscription } from '@/lib/firestore/subscription'

import { RoleTag } from './RoleTag'
import type { UserProfile } from './schema'
import { profileName } from './usersContext'

export type PlayerListProps = {
  /** Every profile, already sorted (see `useProfiles`). */
  profiles: Subscription<UserProfile[]>
}

/** The "Oyuncular" list: everyone who has signed up, with the DM marked. */
export function PlayerList({ profiles }: PlayerListProps) {
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
            <li
              key={profile.id}
              className="flex min-w-0 items-center gap-2 px-3 py-1 text-sm text-ink"
            >
              <Avatar name={profileName(profile)} photoURL={profile.photoURL} size="sm" />
              <span className="truncate">{profileName(profile)}</span>
              {profile.role === 'dm' ? <RoleTag role="dm" /> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
