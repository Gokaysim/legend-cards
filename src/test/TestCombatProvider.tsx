import { type ReactNode, useMemo } from 'react'

import {
  type CombatActions,
  CombatContext,
  type CombatContextValue,
  type CombatView,
} from '@/features/combat/combatContext'
import {
  type Combat,
  type Combatant,
  type DmCombatant,
  IDLE_COMBAT,
} from '@/features/combat/schema'
import { useIsDm } from '@/features/users/usersContext'

export type TestCombat = {
  /** The combat. Defaults to none (idle). */
  combat?: Combat
  /** Its combatants. Defaults to none. */
  combatants?: readonly Combatant[]
  /** The state instead of `combat` and `combatants`, for loading and errors. */
  state?: CombatView
  /** The NPCs' rolls. As in the app, only a DM's device gets them. */
  dmCombatants?: readonly DmCombatant[]
  /** Fakes for the combat steps, for example `vi.fn()`. Missing ones succeed. */
  actions?: Partial<CombatActions>
}

export type TestCombatProviderProps = TestCombat & { children: ReactNode }

const NONE: readonly Combatant[] = []
const NO_DM: readonly DmCombatant[] = []

const succeed = () => Promise.resolve()

const SUCCEEDING: CombatActions = {
  open: succeed,
  rollInitiative: succeed,
  add: succeed,
  clearRoll: succeed,
  start: succeed,
  next: succeed,
  back: succeed,
  endMyTurn: succeed,
  move: succeed,
  remove: succeed,
  end: succeed,
}

/** Provides a fixed combat and fake combat steps to components under test, without Firebase. */
export function TestCombatProvider({
  combat = IDLE_COMBAT,
  combatants = NONE,
  state,
  dmCombatants = NO_DM,
  actions,
  children,
}: TestCombatProviderProps) {
  const isDm = useIsDm()
  const value = useMemo<CombatContextValue>(
    () => ({
      combat: state ?? { status: 'ready', combat, combatants },
      dmCombatants: new Map(isDm ? dmCombatants.map((d) => [d.id, d]) : []),
      actions: { ...SUCCEEDING, ...actions },
    }),
    [state, combat, combatants, dmCombatants, isDm, actions],
  )
  return <CombatContext value={value}>{children}</CombatContext>
}
