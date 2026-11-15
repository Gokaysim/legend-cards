import type { UserProfile } from '@/features/users/schema'
import { profileName } from '@/features/users/usersContext'
import { dative } from '@/lib/turkish'

import type { DrawSession } from './schema'
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
 * Whether the session's cards cost LP: only a player's random draw into their own hand. The DM's draws and Cursed
 * draws are free (spec: card-draws).
 */
export function isPaidSession(
  session: Pick<DrawSession, 'kind' | 'uid' | 'by'>,
  profileOf: ProfileOf,
): boolean {
  return (
    session.kind === 'random' && session.by === session.uid && profileOf(session.by)?.role !== 'dm'
  )
}
