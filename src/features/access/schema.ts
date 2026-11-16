import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { createConverter } from '@/lib/firestore/converter'

/**
 * One address on the DM's access list, at `allowedEmails/{email}` (spec: table-access; design D2, D3 of
 * invite-only-sign-in). The document ID is the address in lowercase. Only accounts whose verified address has an
 * entry may use the app.
 */
export const accessEntrySchema = z.object({
  /** When the DM, or the admin script, added the address. `null` only while the server time is pending. */
  addedAt: z.instanceof(Timestamp).nullable(),
  /** The account that entered with this address, linked at its first entry. Missing until then. */
  uid: z.string().min(1).optional(),
})

export type AccessEntryData = z.infer<typeof accessEntrySchema>

export const accessEntryConverter = createConverter(accessEntrySchema, { idField: 'email' })

/** An access-list entry with its address, the document ID, as `email`. */
export type AccessEntry = AccessEntryData & { email: string }
