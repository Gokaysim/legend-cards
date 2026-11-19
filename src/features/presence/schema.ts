import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { createConverter } from '@/lib/firestore/converter'

/**
 * A user's presence at `presence/{uid}` (spec: player-presence; design D1 of show-online-players): the server time of
 * the latest report from one of the user's devices. Leaving the application deletes it; a user without one is
 * offline. Only the user writes it, and only with the server time (`firestore.rules`).
 */
export const presenceSchema = z.object({
  /** A server timestamp. `null` only in the local snapshot while the server time is pending. */
  lastSeen: z.instanceof(Timestamp).nullable(),
})

export const presenceConverter = createConverter(presenceSchema, { idField: 'uid' })

/** A presence record with the user's uid as `uid`. */
export type Presence = z.infer<typeof presenceSchema> & { uid: string }
