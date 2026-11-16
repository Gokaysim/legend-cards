import type { CombatView } from './combatContext'
import type { Combatant } from './schema'

/** The user's own characters that the open combat waits for (spec: initiative-tracker, "Asking for initiative"). */
export function myWaitingCombatants(view: CombatView, uid: string | null): Combatant[] {
  if (uid === null || view.status !== 'ready' || view.combat.phase !== 'gathering') return []
  return view.combatants.filter((c) => c.kind === 'character' && c.uid === uid && !c.rolled)
}

/** The combat the Zarlar screen last switched to its İnisiyatif tab for, on this page load. */
let switchedFor: string | null = null

/**
 * The combat to switch the Zarlar screen to its İnisiyatif tab for, once (design D8): it waits for one of the user's
 * characters, and the screen has not switched for it yet. `null` otherwise.
 */
export function combatToSwitchFor(view: CombatView, uid: string | null): string | null {
  if (view.status !== 'ready') return null
  const combatId = view.combat.combatId
  if (combatId === null || combatId === switchedFor) return null
  return myWaitingCombatants(view, uid).length > 0 ? combatId : null
}

/** Remembers that the screen switched for `combatId`, so a user who goes back to Kanal stays there. */
export function markSwitchedFor(combatId: string): void {
  switchedFor = combatId
}

/** Forgets the switch; for tests. */
export function resetSwitchMemory(): void {
  switchedFor = null
}
