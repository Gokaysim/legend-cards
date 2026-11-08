import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { createConverter } from '@/lib/firestore/converter'

/** The two currencies: a player's Legend Points and the party's GP. Keep in step with `firestore.rules`. */
export const CURRENCIES = ['lp', 'gp'] as const
export type Currency = (typeof CURRENCIES)[number]

/** Where a balance change came from. Pack-opening adds `pack` and `draw`. Keep in step with `firestore.rules`. */
export const LEDGER_SOURCES = ['manual'] as const
export type LedgerSource = (typeof LEDGER_SOURCES)[number]

/** Limits of one change. Keep in step with `validLedgerEntry` in `firestore.rules`. */
export const BALANCE_LIMITS = {
  /** The largest amount one change adds or subtracts. */
  amount: 1_000_000,
  /** The longest reason. */
  reason: 200,
} as const

/** The ledger account of the party purse. Player accounts are their uids. */
export const PARTY_ACCOUNT = 'party'

const id = z.string().min(1)
/** A server timestamp. `null` only in the local snapshot while the server time is pending. */
const serverTime = z.instanceof(Timestamp).nullable()

/**
 * One change of a balance, at `ledger/{entryId}`. Entries are created together with the balance they set and are
 * never changed or deleted, so the history is permanent. The balance before is `balanceAfter - delta`.
 */
export const ledgerEntrySchema = z
  .object({
    currency: z.enum(CURRENCIES),
    /** The player's uid for LP, `party` for GP. */
    account: id,
    /** The change: positive when added, negative when subtracted, never 0. */
    delta: z
      .number()
      .int()
      .min(-BALANCE_LIMITS.amount)
      .max(BALANCE_LIMITS.amount)
      .refine((delta) => delta !== 0, 'a change is never 0'),
    balanceAfter: z.number().int().min(0),
    source: z.enum(LEDGER_SOURCES),
    /** The DM's reason, shown as "Neden". */
    reason: z.string().min(1).max(BALANCE_LIMITS.reason),
    /** The uid of the user who made the change. */
    by: id,
    at: serverTime,
  })
  .superRefine((entry, context) => {
    if ((entry.currency === 'gp') !== (entry.account === PARTY_ACCOUNT)) {
      context.addIssue({
        code: 'custom',
        path: ['account'],
        message: 'GP belongs to the party, and LP to a player',
      })
    }
  })

export type StoredLedgerEntry = z.infer<typeof ledgerEntrySchema>

/** A ledger entry as features see it: the stored fields plus the document ID as `id`. */
export type LedgerEntry = StoredLedgerEntry & { id: string }

export const ledgerEntryConverter = createConverter(ledgerEntrySchema, { idField: 'id' })

/** The party purse at `party/main`. It exists from the first GP change on; a missing purse holds 0 GP. */
export const partyPurseSchema = z.object({
  gp: z.number().int().min(0),
  /** The ledger entry that set the current `gp`. */
  gpEntryId: id,
})

export type PartyPurse = z.infer<typeof partyPurseSchema>

export const partyPurseConverter = createConverter(partyPurseSchema)
