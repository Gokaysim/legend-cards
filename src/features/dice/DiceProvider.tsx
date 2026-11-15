import { type ReactNode, useMemo, useState } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { useCurrentProfile, useIsDm } from '@/features/users/usersContext'
import { db } from '@/lib/firebase/firestore'
import { useCollection } from '@/lib/firestore/useCollection'
import { useNow } from '@/lib/useNow'

import { recentDmRollsQuery, recentRollsQuery, rollDice, setDiceStyle } from './api'
import { type DiceActions, DiceContext, type DiceContextValue, type DiceRolls } from './diceContext'
import { arrive, type Freshness, NO_FRESHNESS } from './freshness'
import { DEFAULT_DICE_STYLE, type DiceRoll } from './schema'

/** The channel shows this many rolls, and "Daha eski atışlar" asks for this many more (spec: "The channel"). */
export const ROLLS_PAGE = 50

/** How often the provider reads the clock for the 10-second freshness check. */
const CLOCK_TICK_MS = 1000

type Tracking = {
  /** The newest-first rolls the freshness was last computed from. */
  source: readonly DiceRoll[] | null
  freshness: Freshness
}

const NO_ROLLS: readonly DiceRoll[] = []

/**
 * Shares the dice channel with one subscription for the whole app (design D6 of dice-channel): the newest rolls,
 * ordered by `at`, with a limit that grows by 50 with `loadOlder`. On the DM's device it also subscribes to the hidden
 * rolls' content and puts it in place of their public records; a player's device never asks for it. It works out
 * which roll to play now, and binds the dice steps to the signed-in user and their style. Signed out, it subscribes
 * to nothing.
 */
export function DiceProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const isDm = useIsDm()
  const profile = useCurrentProfile()
  const style =
    profile.status === 'ready' && profile.data ? profile.data.diceStyle : DEFAULT_DICE_STYLE
  const now = useNow(CLOCK_TICK_MS)

  const [count, setCount] = useState(ROLLS_PAGE)
  const publicQuery = useMemo(() => (uid ? recentRollsQuery(db, count) : null), [uid, count])
  const dmQuery = useMemo(
    () => (uid && isDm ? recentDmRollsQuery(db, count) : null),
    [uid, isDm, count],
  )
  const publicRolls = useCollection(publicQuery)
  const dmRolls = useCollection(dmQuery)

  // The rolls newest first, with the DM's content in place of the hidden records. `null` while loading.
  const newestFirst = useMemo<readonly DiceRoll[] | null>(() => {
    if (publicRolls.status !== 'ready') return null
    if (dmRolls.status === 'loading') return null
    if (dmRolls.status === 'error' || dmRolls.data.length === 0) return publicRolls.data
    const content = new Map(dmRolls.data.map((roll) => [roll.id, roll.content]))
    return publicRolls.data.map((roll) =>
      roll.hidden && content.has(roll.id)
        ? { ...roll, content: content.get(roll.id) ?? null }
        : roll,
    )
  }, [publicRolls, dmRolls])

  // While "Daha eski atışlar" loads, the channel keeps the rolls it had.
  const [lastRolls, setLastRolls] = useState<readonly DiceRoll[] | null>(null)
  if (newestFirst !== null && newestFirst !== lastRolls) setLastRolls(newestFirst)
  const shown = newestFirst ?? lastRolls

  const [rolledHere, setRolledHere] = useState<ReadonlySet<string>>(() => new Set())
  const [tracking, setTracking] = useState<Tracking>({ source: null, freshness: NO_FRESHNESS })
  if (newestFirst !== null && tracking.source !== newestFirst) {
    // Adjusting state during render: React re-renders at once with the new freshness.
    setTracking({
      source: newestFirst,
      freshness: arrive(tracking.freshness, newestFirst, now, rolledHere),
    })
  }

  const rolls = useMemo<DiceRolls>(() => {
    if (shown !== null) {
      return { status: 'ready', rolls: [...shown].reverse(), hasOlder: shown.length >= count }
    }
    return publicRolls.status === 'error' ? { status: 'error' } : { status: 'loading' }
  }, [shown, count, publicRolls.status])

  const actions = useMemo<DiceActions>(
    () => ({
      roll: async (request) => {
        if (uid === null) throw new Error('Signed out')
        const { roll } = await rollDice(db, { ...request, by: uid, style })
        setRolledHere((current) => new Set([...current, roll.id]))
        setTracking((current) => ({
          ...current,
          freshness: { ...current.freshness, fresh: roll },
        }))
        return roll
      },
      setDiceStyle: (next) =>
        uid === null ? Promise.reject(new Error('Signed out')) : setDiceStyle(db, uid, next),
      loadOlder: () => setCount((current) => current + ROLLS_PAGE),
    }),
    [uid, style],
  )

  const fresh = tracking.freshness.fresh
  const value = useMemo<DiceContextValue>(
    () => ({ rolls: uid === null ? EMPTY : rolls, fresh, actions }),
    [uid, rolls, fresh, actions],
  )
  return <DiceContext value={value}>{children}</DiceContext>
}

const EMPTY: DiceRolls = { status: 'ready', rolls: NO_ROLLS, hasOlder: false }
