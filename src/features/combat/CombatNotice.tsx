import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { useAuth } from '@/features/auth/authContext'
import { useCharacters } from '@/features/characters/charactersContext'
import { INITIATIVE_PATH } from '@/features/dice/diceTabs'
import { useNow } from '@/lib/useNow'

import { myWaitingCombatants } from './asking'
import { useCombat } from './combatContext'

/** How long "Sıra sende" stays (design D9 of add-initiative-tracker). */
export const TURN_NOTICE_MS = 6000

/** A turn change shows only when it happened at most this long ago, as for rolls. */
const FRESH_MS = 10_000

const CLOCK_TICK_MS = 1000

/** The Zarlar screen's address, where "İnisiyatif isteniyor" does not show: the tab opens there instead. */
const DICE_PATH = '/dice'

type TurnNotice = { key: string; name: string; isClosed: boolean }

const cardClasses =
  'fixed inset-x-2.5 bottom-2.5 z-30 flex items-center gap-3 rounded-2xl border border-gold bg-pane-raised p-3 shadow-2xl sm:inset-x-auto sm:top-5 sm:right-5 sm:bottom-auto sm:w-95'

/**
 * The combat's notices (spec: initiative-tracker, "Asking for initiative" and "Your turn"; design D9), mounted once in
 * the app shell. At the bottom of a phone and the top right of a wide window, so they never cover a roll's card.
 * - "İnisiyatif isteniyor", away from the Zarlar screen, while the combat waits for one of the user's characters,
 *   until they roll, the combat moves on, or they close it.
 * - "Sıra sende: <character>", on every screen, when one of the user's characters becomes active, as this device sees
 *   it happen; it closes after 6 seconds.
 */
export function CombatNotice() {
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const combat = useCombat()
  const characters = useCharacters()
  const location = useLocation()
  const now = useNow(CLOCK_TICK_MS)
  const [closedAskFor, setClosedAskFor] = useState<string | null>(null)

  const nameOf = (characterId: string | null) =>
    (characters.status === 'ready'
      ? characters.data.find((c) => c.id === characterId)?.name
      : undefined) ?? 'karakterin'

  // The turn as this device last saw it; `undefined` before the first snapshot, so a reload shows nothing.
  const ready = combat.status === 'ready' ? combat : null
  const running = ready?.combat.phase === 'running' ? ready.combat : null
  const activeId = running ? running.order[running.turn] : undefined
  const turnKey = running
    ? `${running.combatId ?? ''}:${String(running.round)}:${String(running.turn)}:${activeId ?? ''}`
    : 'none'
  const [seenTurnKey, setSeenTurnKey] = useState<string | undefined>(undefined)
  const [turnNotice, setTurnNotice] = useState<TurnNotice | null>(null)
  if (ready && seenTurnKey !== turnKey) {
    // Adjusting state during render: a new turn was seen.
    setSeenTurnKey(turnKey)
    const active = ready.combatants.find((c) => c.id === activeId)
    const turnAt = running?.turnAt?.toMillis() ?? null
    const isFresh = turnAt === null || now - turnAt <= FRESH_MS
    if (
      seenTurnKey !== undefined &&
      active?.kind === 'character' &&
      active.uid === uid &&
      isFresh
    ) {
      setTurnNotice({ key: turnKey, name: nameOf(active.characterId), isClosed: false })
    } else if (turnNotice && turnNotice.key !== turnKey) {
      setTurnNotice(null)
    }
  }

  const shownTurn = turnNotice && !turnNotice.isClosed ? turnNotice : null
  useEffect(() => {
    if (!shownTurn) return
    const timer = setTimeout(() => {
      setTurnNotice((state) => (state ? { ...state, isClosed: true } : state))
    }, TURN_NOTICE_MS)
    return () => clearTimeout(timer)
  }, [shownTurn])

  if (shownTurn) {
    return (
      <aside role="status" aria-label="Sıra sende" className={cardClasses}>
        <span aria-hidden="true" className="text-2xl">
          ⚔
        </span>
        <p className="min-w-0 flex-1 text-sm text-ink">
          <strong className="text-gold">Sıra sende:</strong> {shownTurn.name}
        </p>
        <button
          type="button"
          aria-label="Kapat"
          onClick={() => setTurnNotice((state) => (state ? { ...state, isClosed: true } : state))}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-xl text-ink-muted hover:bg-pane"
        >
          ×
        </button>
      </aside>
    )
  }

  const waiting = myWaitingCombatants(combat, uid)
  const combatId = ready?.combat.combatId ?? null
  const isOnDice = location.pathname.startsWith(DICE_PATH)
  if (waiting.length === 0 || isOnDice || combatId === null || closedAskFor === combatId) {
    return null
  }
  const names = waiting.map((c) => nameOf(c.characterId)).join(', ')
  return (
    <aside role="status" aria-label="İnisiyatif isteniyor" className={cardClasses}>
      <span aria-hidden="true" className="text-2xl">
        🎲
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong className="text-sm text-gold">İnisiyatif isteniyor</strong>
        <span className="truncate text-sm text-ink">{names}</span>
        <Link to={INITIATIVE_PATH} className="text-xs text-gold hover:underline">
          İnisiyatif sekmesini aç
        </Link>
      </div>
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => setClosedAskFor(combatId)}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-xl text-ink-muted hover:bg-pane"
      >
        ×
      </button>
    </aside>
  )
}
