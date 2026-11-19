import { useId } from 'react'
import { NavLink, useMatch } from 'react-router'

import { HAND_ROUTE, handPath } from '@/app/screens'
import { Avatar } from '@/components/ui/Avatar'
import { EyeIcon, EyeOffIcon } from '@/components/ui/icons'
import { formatAmount } from '@/features/balances/format'
import { cn } from '@/lib/cn'
import { useDeviceFlag } from '@/lib/deviceSetting'
import type { Subscription } from '@/lib/firestore/subscription'

import { orderByPresence, withoutOffline } from './playerOrder'
import { RoleTag } from './RoleTag'
import type { UserProfile } from './schema'
import { profileName } from './usersContext'

export type PlayerListProps = {
  /** Every profile, already sorted (see `useProfiles`). */
  profiles: Subscription<UserProfile[]>
  /** Who counts as online (see `usePresence`). Missing, presence is loading. */
  online?: Subscription<ReadonlySet<string>>
  /** The signed-in user, online on their own device even while presence loads. */
  selfUid?: string | null
  /** Called after the user picks a name, so the mobile menu can close. */
  onNavigate?: () => void
}

/** Whether the list is open on this device, shared by the sidebar and the mobile menu. Keep it stable. */
export const PLAYERS_OPEN_KEY = 'lcm.players.open'

/** Whether the list hides offline users on this device, shared by the sidebar and the mobile menu. Keep it stable. */
export const PLAYERS_HIDE_OFFLINE_KEY = 'lcm.players.hideOffline'

const LOADING: Subscription<ReadonlySet<string>> = { status: 'loading' }

const HIDE_OFFLINE_LABEL = 'Çevrimdışıları gizle'

/**
 * The "Oyuncular" list: everyone who has signed up, with the DM marked. Each name opens that user's hand, and the
 * user whose hand is shown is marked (`aria-current`). Each player's LP stands next to the name, outside the
 * link, so the link is named by the player alone. The DM has no LP. The heading opens and closes the list, with the
 * number of users next to it; the device remembers the choice (spec: user-profiles, "Collapsing the player list").
 *
 * Online users carry a green dot and come first, the heading counts them, and an eye button next to the heading hides
 * the offline ones (spec: user-profiles; design D6 of show-online-players). While presence loads, the list keeps the
 * name order, shows everyone, and marks only the signed-in user.
 */
export function PlayerList({
  profiles,
  online = LOADING,
  selfUid = null,
  onNavigate,
}: PlayerListProps) {
  const listId = `${useId()}-list`
  const [isOpen, setIsOpen] = useDeviceFlag(PLAYERS_OPEN_KEY, true)
  const [hidesOffline, setHidesOffline] = useDeviceFlag(PLAYERS_HIDE_OFFLINE_KEY, false)
  const onlineCount =
    profiles.status === 'ready' && online.status === 'ready'
      ? profiles.data.filter((profile) => online.data.has(profile.id)).length
      : null

  return (
    // Named "Oyuncular" without the count, so the region keeps its name as players come and go.
    <section aria-label="Oyuncular" className="flex flex-col gap-2">
      {/* Tight spacing, so the heading with its online count fits one line in the 256 px sidebar. */}
      <div className="flex items-center gap-0.5">
        <h2 className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={listId}
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full flex-wrap items-center gap-x-1 rounded-lg py-0.5 pr-1 pl-3 text-xs font-semibold tracking-wide text-ink-muted uppercase transition-colors hover:bg-pane-raised hover:text-ink"
          >
            <span aria-hidden="true" className="w-3 text-center">
              {isOpen ? '▾' : '▸'}
            </span>
            Oyuncular
            {profiles.status === 'ready' ? (
              <span className="text-[11px] font-normal tracking-normal whitespace-nowrap normal-case tabular-nums">
                ({profiles.data.length}
                {onlineCount === null ? null : ` · ${onlineCount} çevrimiçi`})
              </span>
            ) : null}
          </button>
        </h2>
        {isOpen ? (
          <button
            type="button"
            aria-pressed={hidesOffline}
            aria-label={HIDE_OFFLINE_LABEL}
            title={HIDE_OFFLINE_LABEL}
            onClick={() => setHidesOffline(!hidesOffline)}
            className={cn(
              'shrink-0 rounded-lg p-0.5 text-ink-muted transition-colors hover:bg-pane-raised hover:text-ink',
              hidesOffline && 'text-gold',
            )}
          >
            {hidesOffline ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        ) : null}
      </div>
      <div id={listId} hidden={!isOpen} className="flex flex-col gap-2">
        {isOpen ? (
          <PlayerEntries
            profiles={profiles}
            online={online}
            selfUid={selfUid}
            hidesOffline={hidesOffline}
            onNavigate={onNavigate}
          />
        ) : null}
      </div>
    </section>
  )
}

/** The list's content, rendered only while the list is open. */
function PlayerEntries({
  profiles,
  online,
  selfUid,
  hidesOffline,
  onNavigate,
}: Required<Omit<PlayerListProps, 'onNavigate'>> &
  Pick<PlayerListProps, 'onNavigate'> & { hidesOffline: boolean }) {
  const shownUid = useMatch(HAND_ROUTE)?.params.uid ?? null

  if (profiles.status === 'loading') {
    return (
      <p role="status" className="px-3 text-sm text-ink-muted">
        Oyuncular yükleniyor…
      </p>
    )
  }
  if (profiles.status === 'error') {
    return (
      <p role="alert" className="px-3 text-sm text-danger-ink">
        Oyuncu listesi yüklenemedi.
      </p>
    )
  }
  if (profiles.data.length === 0) {
    return <p className="px-3 text-sm text-ink-muted">Henüz oyuncu yok</p>
  }

  const isOnline = (uid: string) =>
    online.status === 'ready' ? online.data.has(uid) : uid === selfUid
  // The online-first order and the hiding wait for presence: until then, the name order and everyone.
  const entries =
    online.status !== 'ready'
      ? profiles.data
      : hidesOffline
        ? withoutOffline(orderByPresence(profiles.data, online.data), online.data, shownUid)
        : orderByPresence(profiles.data, online.data)

  return (
    <ul className="flex flex-col gap-1">
      {entries.map((profile) => (
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
            <span className="relative flex shrink-0">
              <Avatar name={profileName(profile)} photoURL={profile.photoURL} size="sm" />
              {isOnline(profile.id) ? (
                <span
                  aria-hidden="true"
                  data-testid="online-dot"
                  className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-green ring-2 ring-sidebar"
                />
              ) : null}
            </span>
            <span className="truncate">{profileName(profile)}</span>
            {profile.role === 'dm' ? <RoleTag role="dm" /> : null}
          </NavLink>
          {/* Outside the link, so the link stays named by the user alone (spec: user-profiles, "Online mark"). */}
          {isOnline(profile.id) ? <span className="sr-only">çevrimiçi</span> : null}
          {/* Every user's LP, a DM's included (spec: user-profiles, "Player list"). */}
          <span className="shrink-0 pr-3 text-xs text-ink-muted tabular-nums">
            {formatAmount(profile.lp)} LP
          </span>
        </li>
      ))}
    </ul>
  )
}
