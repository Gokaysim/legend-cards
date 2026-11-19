import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { db } from '@/lib/firebase/firestore'
import type { Subscription } from '@/lib/firestore/subscription'
import { useCollection } from '@/lib/firestore/useCollection'
import { useNow } from '@/lib/useNow'

import { beat, presenceCollectionRef, removePresence } from './api'
import {
  LEAVE_LIMIT_MS,
  type PresenceActions,
  PresenceContext,
  type PresenceContextValue,
} from './presenceContext'
import type { Presence } from './schema'
import {
  type BeatState,
  clockOffset,
  HEARTBEAT_MS,
  onlineUids,
  PRESENCE_TICK_MS,
  shouldBeat,
} from './timing'

const allPresenceRef = presenceCollectionRef(db)

function isVisible(): boolean {
  return document.visibilityState === 'visible'
}

function freshState(now: number): BeatState {
  return {
    visible: isVisible(),
    connected: navigator.onLine,
    leaving: false,
    lastLookedAt: now,
    lastBeatAt: null,
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Reports the signed-in member's presence from this device (spec: player-presence; design D2 and D3 of
 * show-online-players): at once, every `HEARTBEAT_MS` while the tab is on screen or was looked at within the hour,
 * when the tab comes back on screen or the connection returns, and when the user's record goes missing (another tab
 * of theirs closed). Closing the tab and `leave` remove the record and stop the reports. Returns `leave` and the
 * measured offset of the server's clock.
 */
function usePresenceReporter(
  uid: string | null,
  records: Subscription<Presence[]>,
): { leave: () => Promise<void>; offset: number } {
  const state = useRef<BeatState>(freshState(0))
  /** The device time of the report whose server time is still to be seen, for the clock offset. */
  const sentAt = useRef<number | null>(null)
  const warned = useRef(false)
  const [offset, setOffset] = useState(0)

  const tryBeat = useCallback(() => {
    if (uid === null) return
    const now = Date.now()
    const current = state.current
    current.visible = isVisible()
    current.connected = navigator.onLine
    if (current.visible) current.lastLookedAt = now
    if (!shouldBeat(current, now)) return
    current.lastBeatAt = now
    sentAt.current = now
    beat(db, uid).catch((error: unknown) => {
      // For example after the user left the access list. One note is enough: the next reports fail the same way.
      if (warned.current) return
      warned.current = true
      console.warn('Could not report presence', error)
    })
  }, [uid])

  useEffect(() => {
    if (uid === null) return
    state.current = freshState(Date.now())
    sentAt.current = null
    tryBeat()
    const timer = setInterval(tryBeat, HEARTBEAT_MS)

    const onVisibility = () => {
      // Hiding the tab is the last look; showing it is a new one, reported at once.
      state.current.lastLookedAt = Date.now()
      if (isVisible()) tryBeat()
    }
    const onPageHide = () => {
      state.current.leaving = true
      // The browser may drop this write as the page goes; the record then ages out.
      removePresence(db, uid).catch(() => {})
    }
    const onPageShow = (event: PageTransitionEvent) => {
      // Back from the back-forward cache: the page lives again.
      if (!event.persisted) return
      state.current = freshState(Date.now())
      tryBeat()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', tryBeat)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', tryBeat)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [uid, tryBeat])

  useEffect(() => {
    if (uid === null || records.status !== 'ready' || records.fromCache) return
    const own = records.data.find((record) => record.uid === uid)
    if (own === undefined) {
      // Another tab of this user removed the shared record as it closed: report again (throttled).
      tryBeat()
      return
    }
    if (sentAt.current !== null && own.lastSeen !== null && !records.hasPendingWrites) {
      setOffset(clockOffset(sentAt.current, own.lastSeen.toMillis()))
      sentAt.current = null
    }
  }, [uid, records, tryBeat])

  const leave = useCallback(async () => {
    if (uid === null) return
    state.current.leaving = true
    await Promise.race([removePresence(db, uid).catch(() => {}), wait(LEAVE_LIMIT_MS)])
  }, [uid])

  return { leave, offset }
}

/**
 * Reports the signed-in member's presence and shares who counts as online, from one subscription to every user's
 * record. Mounted once under `UsersProvider`. Signed out, or before the access check passes, it reports and reads
 * nothing.
 */
export function PresenceProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const records = useCollection(uid === null ? null : allPresenceRef)
  const { leave, offset } = usePresenceReporter(uid, records)
  const now = useNow(PRESENCE_TICK_MS)

  const online = useMemo<Subscription<ReadonlySet<string>>>(
    () =>
      records.status === 'ready'
        ? { ...records, data: onlineUids(records.data, now + offset, uid) }
        : records,
    [records, now, offset, uid],
  )
  const actions = useMemo<PresenceActions>(() => ({ leave }), [leave])
  const value = useMemo<PresenceContextValue>(() => ({ online, actions }), [online, actions])

  return <PresenceContext value={value}>{children}</PresenceContext>
}
