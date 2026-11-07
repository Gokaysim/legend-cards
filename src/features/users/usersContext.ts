import { createContext, useContext } from 'react'

import type { Subscription } from '@/lib/firestore/subscription'

import type { UserProfile } from './schema'

export type UsersContextValue = {
  /** The signed-in user's own profile. `null` when signed out or before the profile exists. */
  currentProfile: Subscription<UserProfile | null>
  /** Every profile, sorted by name (Turkish collation). Empty when signed out. */
  profiles: Subscription<UserProfile[]>
}

export const UsersContext = createContext<UsersContextValue | null>(null)

function useUsersContext(): UsersContextValue {
  const value = useContext(UsersContext)
  if (!value) throw new Error('Users hooks must be used inside <UsersProvider>')
  return value
}

export function useCurrentProfile(): Subscription<UserProfile | null> {
  return useUsersContext().currentProfile
}

export function useProfiles(): Subscription<UserProfile[]> {
  return useUsersContext().profiles
}

/**
 * True only when the signed-in user's profile has loaded and says DM. Loading, missing and failed profiles
 * count as a player, so a DM-only control never shows by mistake. Hiding is convenience: the rules decide.
 */
export function useIsDm(): boolean {
  const profile = useCurrentProfile()
  return profile.status === 'ready' && profile.data?.role === 'dm'
}

/** The name to show for a profile. */
export function profileName(profile: Pick<UserProfile, 'displayName'>): string {
  return profile.displayName ?? 'İsimsiz oyuncu'
}

/** Sorts profiles by name with Turkish collation (Firestore orders by code points), then by uid. */
export function sortProfiles(profiles: readonly UserProfile[]): UserProfile[] {
  return [...profiles].sort(
    (a, b) =>
      profileName(a).localeCompare(profileName(b), 'tr', { sensitivity: 'base' }) ||
      a.id.localeCompare(b.id),
  )
}
