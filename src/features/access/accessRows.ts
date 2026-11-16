import { profileName } from '@/features/users/usersContext'
import type { UserProfile } from '@/features/users/schema'

import type { AccessEntry } from './schema'

/** One row of the "Masaya erişim" section. */
export type AccessRow = {
  email: string
  /** The profile of the account linked to the entry, or `null` while the person has not entered yet. */
  profile: UserProfile | null
  /** Whether `uid` is set: the person has entered at least once. */
  isLinked: boolean
  /** The signed-in DM's own row, which has no "Çıkar". */
  isMe: boolean
}

/**
 * The section's rows (spec: table-access, "The 'Masaya erişim' section"): rows with a profile first, sorted by name
 * with Turkish collation, then the others, sorted by address.
 */
export function accessRows(
  entries: readonly AccessEntry[],
  profiles: readonly UserProfile[],
  myEmail: string | null,
): AccessRow[] {
  const byUid = new Map(profiles.map((profile) => [profile.id, profile]))
  const rows = entries.map((entry) => ({
    email: entry.email,
    profile: entry.uid ? (byUid.get(entry.uid) ?? null) : null,
    isLinked: entry.uid !== undefined,
    isMe: entry.email === myEmail,
  }))
  return rows.sort((a, b) => {
    if (a.profile && b.profile) {
      return (
        profileName(a.profile).localeCompare(profileName(b.profile), 'tr', {
          sensitivity: 'base',
        }) || a.email.localeCompare(b.email)
      )
    }
    if (a.profile) return -1
    if (b.profile) return 1
    return a.email.localeCompare(b.email)
  })
}
