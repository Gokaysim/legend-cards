import type { UserProfile } from '@/features/users/schema'
import { profileName } from '@/features/users/usersContext'
import { dative } from '@/lib/turkish'

import { DRAW_PRICE, type DrawSession } from './schema'
import type { SessionState } from './sessions'

/** Looks up a profile by its uid; `undefined` while the profiles load or for someone without one. */
export type ProfileOf = (uid: string) => UserProfile | undefined

/** A name for `uid`: their profile's, or "Bir oyuncu" without one. */
export function nameFrom(profileOf: ProfileOf, uid: string): string {
  const profile = profileOf(uid)
  return profile ? profileName(profile) : 'Bir oyuncu'
}

/**
 * The line that names a session (spec: live-draws, "What the watching view shows"): "Ayla kart çekiyor", "Dana,
 * Bora'ya Cursed kart çekiyor", and "… çekti" once it has ended.
 */
export function sessionTitle(
  session: Pick<DrawSession, 'kind' | 'uid' | 'by'>,
  profileOf: ProfileOf,
  state: SessionState,
): string {
  const owner = nameFrom(profileOf, session.uid)
  const what = session.kind === 'cursed' ? 'Cursed kart' : 'kart'
  const verb = state === 'open' ? 'çekiyor' : 'çekti'
  return session.by === session.uid
    ? `${owner} ${what} ${verb}`
    : `${nameFrom(profileOf, session.by)}, ${dative(owner)} ${what} ${verb}`
}

/**
 * Whether the session's cards cost LP under the rule from before the prices were stored: only a player's random draw
 * into their own hand, at 1 LP each. `sessionPayment` uses it for a card stored without its price.
 */
export function isPaidSession(
  session: Pick<DrawSession, 'kind' | 'uid' | 'by'>,
  profileOf: ProfileOf,
): boolean {
  return (
    session.kind === 'random' && session.by === session.uid && profileOf(session.by)?.role !== 'dm'
  )
}

/**
 * The LP the session's cards cost so far (spec: live-draws, "What the watching view shows"; design D4 of
 * adjustable-draw-price): the sum of each card's price. A card stored before the prices counts by the old rule: 1 LP
 * in a player's random draw into their own hand, and nothing otherwise.
 */
export function sessionPayment(
  session: Pick<DrawSession, 'kind' | 'uid' | 'by' | 'draws'>,
  profileOf: ProfileOf,
): number {
  const older = isPaidSession(session, profileOf) ? DRAW_PRICE : 0
  return session.draws.reduce((sum, draw) => sum + (draw.cost ?? older), 0)
}
