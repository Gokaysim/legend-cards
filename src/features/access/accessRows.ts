import { profileName } from '@/features/users/usersContext'
import type { UserProfile } from '@/features/users/schema'

import type { AccessEntry } from './schema'

/**
 * The role control of a row (spec: dm-roles): "DM yap" for a player, "DM'liği al" for another DM, "DM'likten çık" on
 * the signed-in DM's own row while another DM exists, and none for a row without a profile.
 */
export type RoleAction = 'grant' | 'take' | 'stepDown'

/** One row of the "Masaya erişim" section. */
export type AccessRow = {
  email: string
  /** The profile of the account linked to the entry, or `null` while the person has not entered yet. */
  profile: UserProfile | null
  /** Whether `uid` is set: the person has entered at least once. */
  isLinked: boolean
  /** The signed-in DM's own row. */
  isMe: boolean
  /** Whether the person is a DM. A DM's row has no "Çıkar" (spec: table-access, "Removing an address"). */
  isDm: boolean
  /** The row's role control, or `null` for none. */
  roleAction: RoleAction | null
}

/**
 * The section's rows (spec: table-access, "The 'Masaya erişim' section"): rows with a profile first, sorted by name
 * with Turkish collation, then the others, sorted by address. `myUid` is the signed-in DM's uid: their own row may
 * step down only while another profile is a DM (design D3, D4 of give-dms-lp-and-share-the-dm-role).
 */
export function accessRows(
  entries: readonly AccessEntry[],
  profiles: readonly UserProfile[],
  myEmail: string | null,
  myUid: string | null = null,
): AccessRow[] {
  const byUid = new Map(profiles.map((profile) => [profile.id, profile]))
  const hasOtherDm = otherDmOf(profiles, myUid) !== null
  const rows = entries.map((entry) => {
    const profile = entry.uid ? (byUid.get(entry.uid) ?? null) : null
    const isMe = entry.email === myEmail
    const isDm = profile?.role === 'dm'
    const roleAction: RoleAction | null =
      profile === null ? null : !isDm ? 'grant' : !isMe ? 'take' : hasOtherDm ? 'stepDown' : null
    return {
      email: entry.email,
      profile,
      isLinked: entry.uid !== undefined,
      isMe,
      isDm,
      roleAction,
    }
  })
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

/** The uid of a DM other than `myUid`, whom a DM stepping down names (design D3), or `null` when there is none. */
export function otherDmOf(profiles: readonly UserProfile[], myUid: string | null): string | null {
  return profiles.find((profile) => profile.role === 'dm' && profile.id !== myUid)?.id ?? null
}
