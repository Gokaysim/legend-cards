import type { Character } from '@/features/characters/schema'

import { currentOrder, type NaturalMark, naturalMark } from './order'
import type { Combat, Combatant, DmCombatant } from './schema'

/** What a row says besides the total (spec: initiative-tracker). */
export type RowStatus = 'waiting' | 'rolled' | 'notRolled' | 'manual' | null

export const ROW_STATUS_TEXT: Record<Exclude<RowStatus, null>, string> = {
  waiting: 'bekleniyor',
  rolled: 'attı',
  notRolled: 'atmadı',
  manual: 'elle eklendi',
}

/** One combatant as this device may show it. */
export type Row = {
  combatant: Combatant
  name: string
  /** The character, for a character's combatant that still exists. */
  character: Character | null
  /** The die, the modifier and the total, when this device may see them. */
  die: number | null
  modifier: number | null
  total: number | null
  mark: NaturalMark | null
  status: RowStatus
}

/**
 * A combatant as this device shows it (spec: "What players see"): a character's roll for everyone, an NPC's only
 * where its DM record is given, which is the DM's device alone.
 */
export function rowOf(
  combatant: Combatant,
  phase: Combat['phase'],
  characters: ReadonlyMap<string, Character>,
  npcRolls: ReadonlyMap<string, DmCombatant>,
): Row {
  const character =
    combatant.characterId === null ? null : (characters.get(combatant.characterId) ?? null)
  const name = combatant.name ?? character?.name ?? 'Bilinmeyen karakter'
  const npc = npcRolls.get(combatant.id)
  const visible = combatant.roll ?? (combatant.rolled && npc ? npc : null)
  const die = visible?.die ?? null
  const modifier = visible?.modifier ?? null
  let status: RowStatus = null
  if (combatant.manual) status = 'manual'
  else if (!combatant.rolled) status = phase === 'running' ? 'notRolled' : 'waiting'
  else if (visible === null && phase === 'gathering') status = 'rolled'
  return {
    combatant,
    name,
    character,
    die,
    modifier,
    total: die === null ? null : die + (modifier ?? 0),
    mark: naturalMark(die),
    status,
  }
}

/**
 * The rows in the order this device shows them: the stored order once the fight runs; while gathering, the order as
 * it stands on the DM's device and the join order on a player's (design D2).
 */
export function orderedRows(
  combat: Combat,
  combatants: readonly Combatant[],
  characters: ReadonlyMap<string, Character>,
  npcRolls: ReadonlyMap<string, DmCombatant>,
  isDm: boolean,
): Row[] {
  const byId = new Map(combatants.map((c) => [c.id, c]))
  let ids: readonly string[]
  if (combat.phase === 'running') ids = combat.order
  else if (isDm) ids = currentOrder(combatants, npcRolls)
  else ids = [...combatants].sort((a, b) => a.seq - b.seq).map((c) => c.id)
  return ids.flatMap((id) => {
    const combatant = byId.get(id)
    return combatant ? [rowOf(combatant, combat.phase, characters, npcRolls)] : []
  })
}
