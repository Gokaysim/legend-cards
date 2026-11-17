import { createContext, useContext } from 'react'

import type { JoiningCharacter } from './api'
import type { NpcGroup } from './npcs'
import type { SeenTurn } from './order'
import type { Combat, Combatant, DmCombatant } from './schema'

/** The open combat and its combatants, live. */
export type CombatView =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; combat: Combat; combatants: readonly Combatant[] }

/** Who joins a combat or is added to one: table characters and typed NPC groups. */
export type Joining = {
  characters: readonly JoiningCharacter[]
  npcGroups: readonly NpcGroup[]
}

/**
 * The combat steps of `api.ts`, bound to the app's Firestore, the signed-in user and the dice. Components call them
 * through `useCombatActions()`, so unit tests can provide fakes and never load Firebase. Each resolves when the server
 * took the step, and rejects when it was refused.
 */
export type CombatActions = {
  /** "Modifier iste": opens the combat, then rolls each NPC group hidden. */
  open: (joining: Joining) => Promise<void>
  /** "At": rolls 1d20 + the modifier for a character, in the channel, and saves the modifier on the character. */
  rollInitiative: (combatant: Combatant, characterName: string, modifier: number) => Promise<void>
  /** Adds combatants: while gathering, NPC groups are rolled at once; while the fight runs, all join by hand. */
  add: (joining: Joining) => Promise<void>
  /** "Yeniden attır". */
  clearRoll: (combatant: Combatant) => Promise<void>
  /** "Başlat": fixes the order with random ties. */
  start: () => Promise<void>
  /** "Sıradaki" as the DM, from the turn the DM saw. */
  next: (seen: SeenTurn) => Promise<void>
  /** "Geri", from the turn the DM saw. */
  back: (seen: SeenTurn) => Promise<void>
  /** "Turumu bitirdim", from the turn the player saw. */
  endMyTurn: (seen: SeenTurn) => Promise<void>
  /** "Turumu beklet", from the turn the player saw. */
  delayMyTurn: (seen: SeenTurn) => Promise<void>
  /** Moves a combatant to a new place in the order. */
  move: (combatantId: string, toIndex: number) => Promise<void>
  remove: (combatantId: string) => Promise<void>
  /** "Bitir" or "Vazgeç". */
  end: () => Promise<void>
}

export type CombatContextValue = {
  combat: CombatView
  /** The NPCs' rolls by combatant ID: the DM's device only; empty for a player. */
  dmCombatants: ReadonlyMap<string, DmCombatant>
  actions: CombatActions
}

export const CombatContext = createContext<CombatContextValue | null>(null)

function useCombatContext(): CombatContextValue {
  const value = useContext(CombatContext)
  if (!value) throw new Error('Combat hooks must be used inside <CombatProvider>')
  return value
}

/** The open combat, live. Must be used inside `<CombatProvider>`. */
export function useCombat(): CombatView {
  return useCombatContext().combat
}

/**
 * The NPCs' rolls, live, by combatant ID. Only the DM's device subscribes to them; on a player's device the map is
 * always empty. Must be used inside `<CombatProvider>`.
 */
export function useDmCombatants(): ReadonlyMap<string, DmCombatant> {
  return useCombatContext().dmCombatants
}

/** The combat steps. Must be used inside `<CombatProvider>`. */
export function useCombatActions(): CombatActions {
  return useCombatContext().actions
}
