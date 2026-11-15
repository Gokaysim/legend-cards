import { CURSED_BACK, NEUTRAL_BACK, type SpreadBack } from '@/features/art/spreadBack'

import type { StoredDrawSession } from './schema'

/** A session with no draw, turn or end for this long counts as ended (spec: live-draws, design D4). */
export const SESSION_STALE_MS = 10 * 60 * 1000

/** How often the views look again whether a session has gone stale. */
export const SESSION_TICK_MS = 30 * 1000

export type SessionState = 'open' | 'ended'

/**
 * Whether a session is still going on at `now` (milliseconds): it ends when someone ends it, or when it has been idle
 * for `SESSION_STALE_MS`. Staleness is read here, never written. A pending `lastAt` (a write of this device that the
 * server has not timed yet) counts as now.
 */
export function sessionState(
  session: Pick<StoredDrawSession, 'lastAt' | 'endedBy'>,
  now: number,
): SessionState {
  if (session.endedBy !== null) return 'ended'
  if (session.lastAt !== null && now - session.lastAt.toMillis() >= SESSION_STALE_MS) return 'ended'
  return 'open'
}

/**
 * The back of a session's card at `index` (spec: card-draws, "The deck's back"): the Cursed back in a Cursed session,
 * the set's cardback for a draw made with the DM's set filter, and the neutral back otherwise. It never depends on
 * the card.
 */
export function sessionBack(
  session: Pick<StoredDrawSession, 'kind' | 'draws'>,
  index: number,
): SpreadBack {
  if (session.kind === 'cursed') return CURSED_BACK
  const backSet = session.draws[index]?.backSet ?? null
  return backSet === null ? NEUTRAL_BACK : { kind: 'set', setCode: backSet }
}

/** Whether the card at `index` is face up: turned, or every card once the session has ended. */
export function isSessionCardUp(
  session: Pick<StoredDrawSession, 'turned'>,
  index: number,
  state: SessionState,
): boolean {
  return state === 'ended' || session.turned.includes(index)
}
