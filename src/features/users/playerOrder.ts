import type { UserProfile } from './schema'

/**
 * The "Oyuncular" list's order (spec: user-profiles, "Player list"; design D6 of show-online-players): the online users
 * first, then the rest, each group in the order given (the name order of `useProfiles`). Only the list uses it: every
 * other list of users keeps the name order.
 */
export function orderByPresence<P extends Pick<UserProfile, 'id'>>(
  profiles: readonly P[],
  online: ReadonlySet<string>,
): P[] {
  return [
    ...profiles.filter((profile) => online.has(profile.id)),
    ...profiles.filter((profile) => !online.has(profile.id)),
  ]
}

/**
 * The entries the list shows while offline users are hidden (spec: user-profiles, "Hiding offline users"): the online
 * users, and the user whose hand is shown (`shownUid`) even when offline.
 */
export function withoutOffline<P extends Pick<UserProfile, 'id'>>(
  profiles: readonly P[],
  online: ReadonlySet<string>,
  shownUid: string | null,
): P[] {
  return profiles.filter((profile) => online.has(profile.id) || profile.id === shownUid)
}
