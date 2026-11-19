import { NavLink } from 'react-router'

import { useAuth } from '@/features/auth/authContext'
import { PartyPurse } from '@/features/balances/PartyPurse'
import { UnseenRollsBadge } from '@/features/dice/UnseenRollsBadge'
import { usePresence } from '@/features/presence/presenceContext'
import { PlayerList } from '@/features/users/PlayerList'
import { useProfiles } from '@/features/users/usersContext'
import { cn } from '@/lib/cn'

import { SCREENS } from '../screens'
import { UserBadge } from './UserBadge'

export type SidebarContentProps = {
  /** Called after the user picks a screen or a player, so the mobile menu can close. */
  onNavigate?: () => void
}

/** App name, version, the screen navigation, the party purse, the players and the signed-in user. Shared by the sidebar and the mobile menu. */
export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const profiles = useProfiles()
  const online = usePresence()
  const auth = useAuth()
  const selfUid = auth.status === 'signedIn' ? auth.user.uid : null
  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <div>
        <p className="text-xl font-semibold text-gold">✦ Legend Cards</p>
        <p className="mt-1 text-xs text-ink-muted">v{__APP_VERSION__}</p>
      </div>
      <nav aria-label="Ana menü" className="flex flex-col gap-1">
        {SCREENS.map((screen) => (
          <NavLink
            key={screen.id}
            to={screen.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-pane-raised',
                isActive && 'bg-pane-raised font-semibold text-gold',
              )
            }
          >
            <span aria-hidden="true" className="w-5 text-center">
              {screen.icon}
            </span>
            {screen.label}
            {screen.id === 'dice' ? <UnseenRollsBadge /> : null}
          </NavLink>
        ))}
      </nav>
      <PartyPurse />
      <PlayerList profiles={profiles} online={online} selfUid={selfUid} onNavigate={onNavigate} />
      <div className="mt-auto">
        <UserBadge />
      </div>
    </div>
  )
}
