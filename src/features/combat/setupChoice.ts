import type { Character } from '@/features/characters/schema'
import type { UserProfile } from '@/features/users/schema'
import type { Subscription } from '@/lib/firestore/subscription'

/**
 * The characters "Savaş başlat" checks when it opens (spec: initiative-tracker, "Setting up a combat"; design D7 of
 * show-online-players): every unarchived character of a player who is online. The DM's own stay unchecked. While
 * presence is not ready (loading or failed), every player counts, as before presence existed.
 */
export function initialCombatChoice(
  characters: readonly Character[],
  profiles: readonly Pick<UserProfile, 'id' | 'role'>[],
  online: Subscription<ReadonlySet<string>>,
): ReadonlySet<string> {
  const roles = new Map(profiles.map((profile) => [profile.id, profile.role] as const))
  return new Set(
    characters
      .filter(
        (c) =>
          !c.archived &&
          roles.get(c.uid) !== 'dm' &&
          (online.status !== 'ready' || online.data.has(c.uid)),
      )
      .map((c) => c.id),
  )
}

/** Whether the setup marks `uid`'s group as offline: only once presence is ready and says so. */
export function isOfflineOwner(uid: string, online: Subscription<ReadonlySet<string>>): boolean {
  return online.status === 'ready' && !online.data.has(uid)
}
