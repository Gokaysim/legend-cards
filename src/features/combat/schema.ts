import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { createConverter } from '@/lib/firestore/converter'

/**
 * The combat's limits (spec: initiative-tracker). Keep in step with the combat rules in `firestore.rules` and with
 * `CHARACTER_LIMITS` for the modifier.
 */
export const COMBAT_LIMITS = {
  /** Combatants in one combat ("Typed NPCs"). */
  combatants: 50,
  /** NPCs added at once ("Typed NPCs"), rolled as one hidden roll of that many d20 (design D4). */
  npcCount: 12,
  /**
   * Characters written in one transaction (design D1 of open-large-combats). The combatant rule reads each
   * character's record (`exists()` and `get()`, both counted), and the rules may read at most 20 documents per
   * request, so one write carried at most 8 characters on the emulator. 6 leaves a margin for future rules.
   */
  charactersPerWrite: 6,
  /** A typed NPC name. */
  name: 40,
  /** A stored NPC name: the typed name with " 12" at most. */
  storedName: 44,
  modifierMin: -10,
  modifierMax: 30,
} as const

export const COMBAT_PATH = 'combat/main'
export const COMBATANTS_COLLECTION = 'combatants'
export const DM_COMBATANTS_COLLECTION = 'dmCombatants'
export const COMBAT_CHANGES_COLLECTION = 'combatChanges'

/** A server timestamp. `null` while the server time is pending, or where the field is not set. */
const serverTime = z.instanceof(Timestamp).nullable()
const id = z.string().min(1)
const modifier = z.number().int().min(COMBAT_LIMITS.modifierMin).max(COMBAT_LIMITS.modifierMax)

/**
 * Where a combat stands (design D1):
 * - `idle`: no combat
 * - `gathering`: the DM asked for initiative, and the rolls come in
 * - `running`: the fight runs, in a fixed order
 */
export const COMBAT_PHASES = ['idle', 'gathering', 'running'] as const
export type CombatPhase = (typeof COMBAT_PHASES)[number]

/** The one combat, at `combat/main` (design D1). A missing document is an idle combat. */
export const combatSchema = z.object({
  phase: z.enum(COMBAT_PHASES),
  /** A new random ID per combat; `null` while idle. */
  combatId: id.nullable(),
  /** The combatant IDs in initiative order: empty while gathering, fixed at "Başlat". */
  order: z.array(id).max(COMBAT_LIMITS.combatants),
  /** The active place in `order`. */
  turn: z.number().int().min(0),
  /** The round, from 1 once the fight runs; 0 before. */
  round: z.number().int().min(0),
  /** When the DM asked for initiative. */
  askedAt: serverTime,
  /** When the active combatant last changed. */
  turnAt: serverTime,
  /** The newest `combatChanges` record, or `null` before the first one. */
  changeId: id.nullable(),
})

export type Combat = z.infer<typeof combatSchema>

/** No combat: what a missing document reads as. */
export const IDLE_COMBAT: Combat = {
  phase: 'idle',
  combatId: null,
  order: [],
  turn: 0,
  round: 0,
  askedAt: null,
  turnAt: null,
  changeId: null,
}

export const combatConverter = createConverter(combatSchema)

export const COMBATANT_KINDS = ['character', 'npc'] as const
export type CombatantKind = (typeof COMBATANT_KINDS)[number]

/** A character's public initiative roll: the die, the modifier, and the `diceRolls` record that shows them. */
export const combatantRollSchema = z.object({
  rollId: id,
  die: z.number().int().min(1).max(20),
  modifier,
})

export type CombatantRoll = z.infer<typeof combatantRollSchema>

/**
 * One combatant of the open combat, at `combatants/{combatantId}` (design D1). Everyone signed in reads it, so an
 * NPC holds only whether it rolled; its numbers are in `dmCombatants`.
 */
export const combatantSchema = z
  .object({
    combatId: id,
    kind: z.enum(COMBATANT_KINDS),
    /** The table character, or `null` for a typed NPC. */
    characterId: id.nullable(),
    /** The character's owner; the DM for a typed NPC. */
    uid: id,
    /** A typed NPC's name; `null` for a character, whose name is read live. */
    name: z.string().min(1).max(COMBAT_LIMITS.storedName).nullable(),
    /** The join order. */
    seq: z.number().int().min(0),
    /** Added during the fight, without a roll. */
    manual: z.boolean(),
    rolled: z.boolean(),
    /** A character's roll; always `null` for an NPC. */
    roll: combatantRollSchema.nullable(),
  })
  .refine(
    (c) =>
      c.kind === 'character'
        ? c.characterId !== null && c.name === null
        : c.characterId === null && c.name !== null && c.roll === null,
    { message: 'a character has its ID and no name; an NPC has a name and no public roll' },
  )

export type StoredCombatant = z.infer<typeof combatantSchema>
export type Combatant = StoredCombatant & { id: string }

export const combatantConverter = createConverter(combatantSchema, { idField: 'id' })

/** An NPC's roll, at `dmCombatants/{combatantId}`: the DM's device only (design D1). */
export const dmCombatantSchema = z.object({
  combatId: id,
  /** The hidden roll of the NPC's group. */
  rollId: id,
  die: z.number().int().min(1).max(20),
  modifier,
})

export type StoredDmCombatant = z.infer<typeof dmCombatantSchema>
export type DmCombatant = StoredDmCombatant & { id: string }

export const dmCombatantConverter = createConverter(dmCombatantSchema, { idField: 'id' })

/** The steps of a fight that the log shows (spec: activity-log, "Fights are events"). */
export const COMBAT_STEPS = ['start', 'end'] as const
export type CombatStep = (typeof COMBAT_STEPS)[number]

/**
 * The start or the end of a fight, at `combatChanges/{changeId}` (design D7). Created once with the combat change it
 * records, never changed or deleted.
 */
export const combatChangeSchema = z.object({
  /** The DM. */
  by: id,
  at: serverTime,
  step: z.enum(COMBAT_STEPS),
  /** The combatants at the start, or the round at the end. */
  count: z.number().int().min(0),
})

export type StoredCombatChange = z.infer<typeof combatChangeSchema>
export type CombatChange = StoredCombatChange & { id: string }

export const combatChangeConverter = createConverter(combatChangeSchema, { idField: 'id' })
