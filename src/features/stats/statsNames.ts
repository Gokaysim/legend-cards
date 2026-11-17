import { useMemo } from 'react'

import { profileName, useProfiles } from '@/features/users/usersContext'

import type { NameOf } from './historyText'

/** The name of a user whose profile is missing, as in the library. */
export const UNKNOWN_PLAYER = 'İsimsiz oyuncu'

/**
 * How the statistics pages name users: everyone by their profile name, a DM included, so that one of several DMs is
 * told apart (design D6 of give-dms-lp-and-share-the-dm-role), and "İsimsiz oyuncu" for a
 * missing profile. `loading` until the profiles are read; profiles that cannot be read leave every name unknown.
 */
export function useStatsNames(): { status: 'loading' | 'ready'; nameOf: NameOf } {
  const profiles = useProfiles()
  return useMemo(() => {
    const byId = new Map(profiles.status === 'ready' ? profiles.data.map((p) => [p.id, p]) : [])
    const nameOf: NameOf = (uid) => {
      const profile = byId.get(uid)
      if (!profile) return UNKNOWN_PLAYER
      return profileName(profile)
    }
    return { status: profiles.status === 'loading' ? 'loading' : 'ready', nameOf }
  }, [profiles])
}
