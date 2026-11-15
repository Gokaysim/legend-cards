import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { createConverter } from '@/lib/firestore/converter'

import { DEFAULT_PLAYER_DRAW_MODE, PLAYER_DRAW_MODES, type PlayerDrawMode } from './playerDraw'

/**
 * The table's shared state, at `table/main`:
 * - which pack is open. While a pack is open, the whole table waits for it, and no card or balance moves.
 * - the table setting "Oyuncu kart çekişi" (spec: table-settings), with the record of its last change.
 *
 * A missing document means that no pack is open and the mode is off. A document written before the setting existed
 * has no mode fields: it reads as off, without a change.
 */
export const tableSchema = z.object({
  /** The `draws/{id}` of the open pack, or `null` when no pack is open. */
  openPackId: z.string().min(1).nullable(),
  /** The player draw mode. */
  playerDraw: z.enum(PLAYER_DRAW_MODES).default(DEFAULT_PLAYER_DRAW_MODE),
  /** The `tableChanges/{id}` of the mode's last change, or `null` before the first one. */
  playerDrawChangeId: z.string().min(1).nullable().default(null),
})

export type Table = z.infer<typeof tableSchema>

export const tableConverter = createConverter(tableSchema)

/** The open pack's ID from the table document, which is `null` or missing when no pack is open. */
export function openPackIdOf(table: Table | null | undefined): string | null {
  return table?.openPackId ?? null
}

/** The player draw mode from the table document: off when the document is missing. */
export function playerDrawModeOf(table: Table | null | undefined): PlayerDrawMode {
  return table?.playerDraw ?? DEFAULT_PLAYER_DRAW_MODE
}

/** The settings a table change record can name. Only the player draw mode so far. */
export const TABLE_SETTINGS = ['playerDraw'] as const

/** A server timestamp. `null` only in the local snapshot while the server time is pending. */
const serverTime = z.instanceof(Timestamp).nullable()

/**
 * One change of a table setting by the DM, at `tableChanges/{changeId}` (design D2 of player-draw-modes). It is
 * created once, together with the table change it records, and never changed or deleted.
 */
export const tableChangeSchema = z.object({
  /** The DM who changed it. */
  by: z.string().min(1),
  at: serverTime,
  setting: z.enum(TABLE_SETTINGS),
  before: z.enum(PLAYER_DRAW_MODES),
  after: z.enum(PLAYER_DRAW_MODES),
})

export const tableChangeConverter = createConverter(tableChangeSchema, { idField: 'id' })

/** A table change record with its document ID as `id`. */
export type TableChange = z.infer<typeof tableChangeSchema> & { id: string }
