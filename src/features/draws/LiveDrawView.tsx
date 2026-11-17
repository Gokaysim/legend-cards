import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/authContext'
import { useCardsById } from '@/features/cards/cardsContext'
import { useIsDm, useProfiles } from '@/features/users/usersContext'
import { useNow } from '@/lib/useNow'

import { useDrawActions, useDrawSessions } from './drawsContext'
import { LiveDrawDialog } from './LiveDrawDialog'
import type { DrawSession } from './schema'
import { isSessionCardUp, sessionCardBack, SESSION_TICK_MS, sessionState } from './sessions'
import { type ProfileOf, sessionTitle } from './sessionText'
import { LiveBanner } from './table/LiveBanner'

/** What this device has done with the sessions it watches (design D6 of live-draws). */
type ViewState = {
  /** Every session this device has seen, open or ended. */
  seen: ReadonlySet<string>
  /** The one shown expanded, or `null`. */
  expanded: string | null
}

const NO_STATE: ViewState = { seen: new Set(), expanded: null }

/**
 * Other users' draw sessions, on every screen of this device, live (spec: live-draws). Mounted once in the app shell.
 * A session this device has not seen opens expanded and takes the place of the one shown before, which turns into
 * its banner, as every other open session does. The user's own sessions never show: their dialog is open. An ended
 * session stays expanded until it is closed; a shrunk one goes away when it ends.
 */
export function LiveDrawView() {
  const auth = useAuth()
  const me = auth.status === 'signedIn' ? auth.user.uid : null
  const sessions = useDrawSessions()
  const profiles = useProfiles()
  const isDm = useIsDm()
  const actions = useDrawActions()
  const cardsById = useCardsById()
  const now = useNow(SESSION_TICK_MS)
  const [view, setView] = useState<ViewState>(NO_STATE)

  const watched = sessions.filter((session) => session.by !== me)
  const unseen = watched.filter((session) => !view.seen.has(session.id))
  if (unseen.length > 0) {
    // Sessions this device has not seen yet: the newest open one opens. Adjusting state during render re-renders at
    // once, before anything shows.
    const opening = unseen.find((session) => sessionState(session, now) === 'open')
    setView({
      seen: new Set([...view.seen, ...unseen.map((session) => session.id)]),
      expanded: opening ? opening.id : view.expanded,
    })
    return null
  }

  const profileOf: ProfileOf = (uid) =>
    profiles.status === 'ready' ? profiles.data.find((profile) => profile.id === uid) : undefined
  const byCard = cardsById.status === 'ready' ? cardsById.data : null
  const expanded = watched.find((session) => session.id === view.expanded)
  const banners = watched.filter(
    (session) => session.id !== view.expanded && sessionState(session, now) === 'open',
  )
  const setExpanded = (expandedId: string | null) =>
    setView((current) => ({ ...current, expanded: expandedId }))

  const bannerOf = (session: DrawSession) => {
    const up = session.turned.length
    return (
      <LiveBanner
        key={session.id}
        text={`${sessionTitle(session, profileOf, 'open')} · ${session.draws.length} kart · ${up} açık`}
        cards={session.draws.map((entry, index) => {
          const card = byCard?.get(entry.cardId)
          return {
            key: entry.drawId,
            card,
            isUp: isSessionCardUp(session, index, 'open'),
            back: sessionCardBack(session, card),
          }
        })}
        onShow={() => setExpanded(session.id)}
        actions={
          isDm && me !== null ? (
            <Button
              variant="danger"
              onClick={() => {
                actions.endDrawSession(session.id, me).catch(() => undefined)
              }}
            >
              Bitir
            </Button>
          ) : null
        }
      />
    )
  }

  return (
    <>
      {banners.length > 0 ? (
        <div className="flex flex-col gap-2">{banners.map(bannerOf)}</div>
      ) : null}
      {expanded ? (
        <LiveDrawDialog
          // A fresh dialog for each session: nothing carries over.
          key={expanded.id}
          session={expanded}
          state={sessionState(expanded, now)}
          profileOf={profileOf}
          onClose={() => setExpanded(null)}
        />
      ) : null}
    </>
  )
}
