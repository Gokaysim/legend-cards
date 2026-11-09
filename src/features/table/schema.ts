import { z } from 'zod'

import { createConverter } from '@/lib/firestore/converter'

/**
 * The table's shared state, at `table/main`: which pack is open. While a pack is open, the whole table waits for
 * it, and no card or balance moves. A missing document means that no pack is open.
 */
export const tableSchema = z.object({
  /** The `draws/{id}` of the open pack, or `null` when no pack is open. */
  openPackId: z.string().min(1).nullable(),
})

export type Table = z.infer<typeof tableSchema>

export const tableConverter = createConverter(tableSchema)

/** The open pack's ID from the table document, which is `null` or missing when no pack is open. */
export function openPackIdOf(table: Table | null | undefined): string | null {
  return table?.openPackId ?? null
}
