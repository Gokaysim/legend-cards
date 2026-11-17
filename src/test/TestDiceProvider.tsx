import { type ReactNode, useMemo, useState } from 'react'

import { useAuth } from '@/features/auth/authContext'
import {
  type DiceActions,
  DiceContext,
  type DiceContextValue,
  type DiceRolls,
} from '@/features/dice/diceContext'
import type { DiceRoll } from '@/features/dice/schema'

import { fakeRoll } from './diceFixtures'

export type TestDice = {
  /** The channel's rolls, oldest first, ready. Defaults to none. */
  rolls?: readonly DiceRoll[]
  /** The channel's state instead of `rolls`, for loading and errors. */
  state?: DiceRolls
  /** Whether "Daha eski atışlar" may find more. Defaults to false. */
  hasOlder?: boolean
  /** The roll to play now. Defaults to none; a roll made through `actions.roll` takes its place. */
  fresh?: DiceRoll | null
  /**
   * Fakes for the dice steps, for example `vi.fn()`. Missing ones succeed: the default roll resolves with every die
   * on its lowest face, by the signed-in user, in Galaxy, pending.
   */
  actions?: Partial<DiceActions>
}

export type TestDiceProviderProps = TestDice & { children: ReactNode }

const NO_ROLLS: readonly DiceRoll[] = []

/** Provides a fixed dice channel and fake dice steps to components under test, without Firebase. */
export function TestDiceProvider({
  rolls = NO_ROLLS,
  state,
  hasOlder = false,
  fresh = null,
  actions,
  children,
}: TestDiceProviderProps) {
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : 'signed-out'
  const [rolled, setRolled] = useState<{ roll: DiceRoll; after: DiceRoll | null } | null>(null)
  // A roll made here plays until a newer fresh roll is given.
  const current = rolled && rolled.after === fresh ? rolled.roll : fresh
  const value = useMemo<DiceContextValue>(() => {
    const succeeding: DiceActions = {
      roll: (request) => {
        const roll = fakeRoll(request, uid)
        setRolled({ roll, after: fresh })
        return Promise.resolve(roll)
      },
      rollWith: (request) => {
        const roll = fakeRoll(request, uid)
        setRolled({ roll, after: fresh })
        return Promise.resolve({ roll, written: Promise.resolve() })
      },
      setDiceStyle: () => Promise.resolve(),
      loadOlder: () => undefined,
      countRolls: () => Promise.resolve(rolls.length),
      resetChannel: () => Promise.resolve(rolls.length),
    }
    return {
      rolls: state ?? { status: 'ready', rolls, hasOlder },
      fresh: current,
      actions: { ...succeeding, ...actions },
    }
  }, [state, rolls, hasOlder, current, fresh, actions, uid])
  return <DiceContext value={value}>{children}</DiceContext>
}
