import { Timestamp } from 'firebase/firestore'

import type { LedgerEntry, PartyPurse } from '@/features/balances/schema'

/**
 * A ledger entry made by the DM `dm-1` at `atMillis`: by default 2 LP added to `user-1`, from 5 to 7, with the
 * reason "Boss'u yendi". The ID is `entry-<atMillis>` unless overridden.
 */
export function testLedgerEntry(
  atMillis: number,
  overrides: Partial<LedgerEntry> = {},
): LedgerEntry {
  return {
    id: `entry-${atMillis}`,
    currency: 'lp',
    account: 'user-1',
    delta: 2,
    balanceAfter: 7,
    source: 'manual',
    reason: "Boss'u yendi",
    by: 'dm-1',
    at: Timestamp.fromMillis(atMillis),
    ...overrides,
  }
}

/** A GP entry for the party purse, otherwise like `testLedgerEntry`. */
export function testGpEntry(atMillis: number, overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return testLedgerEntry(atMillis, {
    currency: 'gp',
    account: 'party',
    delta: 5000,
    balanceAfter: 12500,
    reason: 'Ejderha hazinesi',
    ...overrides,
  })
}

/** A party purse holding `gp`. */
export function testPartyPurse(gp: number): PartyPurse {
  return { gp, gpEntryId: 'purse-entry' }
}
