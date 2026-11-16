import { createContext, useContext } from 'react'

import type { AlsoWrite, RollInput } from './api'
import type { DiceRoll, DiceStyle } from './schema'

/** A roll as the form asks for it; the provider adds the roller and their dice style. */
export type RollRequest = Omit<RollInput, 'by' | 'style'>

/**
 * The dice steps of `api.ts`, bound to the app's Firestore and the signed-in user. Components call them through
 * `useDiceActions()`, so unit tests can provide fakes and never load Firebase.
 */
export type DiceActions = {
  /** Throws and writes a roll, and resolves with it at once for the local playback, before the server has it. */
  roll: (request: RollRequest) => Promise<DiceRoll>
  /**
   * Like `roll`, with other writes in the same batch (design D3 of add-initiative-tracker). Resolves at once with the
   * roll and `written`, which settles when the server took or refused the batch.
   */
  rollWith: (
    request: RollRequest,
    alsoWrite: AlsoWrite,
  ) => Promise<{ roll: DiceRoll; written: Promise<void> }>
  /** Saves the user's own dice style. */
  setDiceStyle: (style: DiceStyle) => Promise<void>
  /** Asks for 50 older rolls. */
  loadOlder: () => void
}

/** The channel's rolls, oldest first. */
export type DiceRolls =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready'
      /** Oldest first. A roll whose `at` is `null` is still waiting to be sent. */
      rolls: readonly DiceRoll[]
      /** Whether "Daha eski atışlar" may find older rolls. */
      hasOlder: boolean
    }

export type DiceContextValue = {
  rolls: DiceRolls
  /** The roll to play now: a fresh arrival, or a roll this device just made. */
  fresh: DiceRoll | null
  actions: DiceActions
}

export const DiceContext = createContext<DiceContextValue | null>(null)

function useDiceContext(): DiceContextValue {
  const value = useContext(DiceContext)
  if (!value) throw new Error('Dice hooks must be used inside <DiceProvider>')
  return value
}

/** The channel: the newest rolls, oldest first, live. Must be used inside `<DiceProvider>`. */
export function useDiceRolls(): DiceRolls {
  return useDiceContext().rolls
}

/**
 * The roll to play now (spec: dice-rolls, "Only fresh rolls play"), or `null`: a roll that arrived after this device
 * started, as the newest of its snapshot, within 10 seconds of being made, or a roll this device just made. Must be
 * used inside `<DiceProvider>`.
 */
export function useFreshRoll(): DiceRoll | null {
  return useDiceContext().fresh
}

/** The dice steps. Must be used inside `<DiceProvider>`. */
export function useDiceActions(): DiceActions {
  return useDiceContext().actions
}

/** Whether a roll is still waiting to be sent: its server time is pending. */
export function isPendingRoll(roll: DiceRoll): boolean {
  return roll.at === null
}
