import { useEffect } from 'react'

import { useAuth } from '@/features/auth/authContext'

import { useLastSeen } from './deviceSettings'
import { useDiceRolls } from './diceContext'
import type { DiceRoll } from './schema'

/**
 * How many rolls in the channel's window were made after `lastSeen` (spec: dice-rolls, "Rolls the user has not seen"):
 * not the user's own, and visible to them, so a hidden roll never counts on a player's device. A window of 50 is
 * enough for "9+".
 */
export function unseenCount(
  rolls: readonly DiceRoll[],
  uid: string,
  lastSeen: number | null,
): number {
  if (lastSeen === null) return 0
  return rolls.filter(
    (roll) =>
      roll.by !== uid && roll.content !== null && roll.at !== null && roll.at.toMillis() > lastSeen,
  ).length
}

/** The count as the menu shows it: nothing for 0, "9+" above 9. */
export function unseenLabel(count: number): string | null {
  if (count <= 0) return null
  return count > 9 ? '9+' : String(count)
}

/**
 * The rolls this device has not shown the user. The first time, the count starts from now: older rolls are not
 * counted.
 */
export function useUnseenRolls(): number {
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const { lastSeen, markSeen } = useLastSeen(uid)
  const rolls = useDiceRolls()
  useEffect(() => {
    if (uid !== null && lastSeen === null) markSeen(Date.now())
  }, [uid, lastSeen, markSeen])
  if (uid === null || rolls.status !== 'ready') return 0
  return unseenCount(rolls.rolls, uid, lastSeen)
}
