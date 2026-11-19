import { useId } from 'react'
import { NavLink } from 'react-router'

import { handPath } from '@/app/screens'
import { Avatar } from '@/components/ui/Avatar'
import { formatAmount } from '@/features/balances/format'
import { cn } from '@/lib/cn'
import { useDeviceFlag } from '@/lib/deviceSetting'
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

/** Whether the list is open on this device, shared by the sidebar and the mobile menu. Keep it stable. */
export const PLAYERS_OPEN_KEY = 'lcm.players.open'

/**
 * The "Oyuncular" list: everyone who has signed up, with the DM marked. Each name opens that user's hand, and the
 * user whose hand is shown is marked (`aria-current`). Each player's LP stands next to the name, outside the
 * link, so the link is named by the player alone. The DM has no LP. The heading opens and closes the list, with the
 * number of users next to it; the device remembers the choice (spec: user-profiles, "Collapsing the player list").
 */
export function PlayerList({ profiles, onNavigate }: PlayerListProps) {
  const listId = `${useId()}-list`
  const [isOpen, setIsOpen] = useDeviceFlag(PLAYERS_OPEN_KEY, true)

  return (
    // Named "Oyuncular" without the count, so the region keeps its name as players come and go.
    <section aria-label="Oyuncular" className="flex flex-col gap-2">
      <h2>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={listId}
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center gap-1.5 rounded-lg px-3 py-0.5 text-xs font-semibold tracking-wide text-ink-muted uppercase transition-colors hover:bg-pane-raised hover:text-ink"
        >
          <span aria-hidden="true" className="w-3 text-center">
            {isOpen ? '▾' : '▸'}
          </span>
          Oyuncular
          {profiles.status === 'ready' ? (
            <span className="font-normal tabular-nums">({profiles.data.length})</span>
          ) : null}
        </button>
      </h2>
      <div id={listId} hidden={!isOpen} className="flex flex-col gap-2">
        {isOpen ? <PlayerEntries profiles={profiles} onNavigate={onNavigate} /> : null}
      </div>
    </section>
  )
}

/** The list's content, rendered only while the list is open. */
function PlayerEntries({ profiles, onNavigate }: PlayerListProps) {
  return (
    <>
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
            <li key={profile.id} className="flex items-center gap-1">
              <NavLink
                to={handPath(profile.id)}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-1 text-sm text-ink transition-colors hover:bg-pane-raised',
                    isActive && 'bg-pane-raised font-semibold text-gold',
                  )
                }
              >
                <Avatar name={profileName(profile)} photoURL={profile.photoURL} size="sm" />
                <span className="truncate">{profileName(profile)}</span>
                {profile.role === 'dm' ? <RoleTag role="dm" /> : null}
              </NavLink>
              {/* Every user's LP, a DM's included (spec: user-profiles, "Player list"). */}
              <span className="shrink-0 pr-3 text-xs text-ink-muted tabular-nums">
                {formatAmount(profile.lp)} LP
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
