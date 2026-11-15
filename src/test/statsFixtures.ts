import { Timestamp } from 'firebase/firestore'

import type { CardRecords } from '@/features/stats/cardHistory'
import type { UserProfile } from '@/features/users/schema'

import { testCard } from './cardFixtures'
import { testDraw } from './drawFixtures'
import { testProfile } from './fixtures'
import { testHolding } from './holdingFixtures'
import { testPack } from './packFixtures'

// The history of "Aboleth's Eyes" in the card-stats spec ("The card's stat tiles", "The Geçmiş list"), for the
// counting tests and the pages' tests.

/** "Aboleth's Eyes": a Common Kesqer card of Arcanus Divine that costs 1. */
export const ABOLETH = testCard("Aboleth's Eyes")

/** A time in 2026, in the device's time zone, in milliseconds. */
export function in2026(month: number, day: number, hour = 20, minute = 0): number {
  return new Date(2026, month - 1, day, hour, minute).getTime()
}

/** The moment the tests read the history: 15 November 2026 at noon. */
export const STATS_NOW = in2026(11, 15, 12)

const ts = (millis: number) => Timestamp.fromMillis(millis)

/** The DM of the statistics tests, `dm-1`. */
export const STATS_DM: UserProfile = testProfile({ id: 'dm-1', displayName: 'Gökay', role: 'dm' })

/** Ayla, a player. */
export const STATS_AYLA: UserProfile = testProfile({ id: 'ayla', displayName: 'Ayla' })

/** The DM and the players Ayla, Bora and Dana. */
export const STATS_PROFILES: UserProfile[] = [
  STATS_DM,
  STATS_AYLA,
  testProfile({ id: 'bora', displayName: 'Bora' }),
  testProfile({ id: 'dana', displayName: 'Dana' }),
]

/** A pack of Bora's that showed `card` at `position`, with the other places filled. */
export function packShowing(
  card: { id: string },
  position: number,
  overrides: Parameters<typeof testPack>[1] = {},
) {
  const offered = ['legend-a', 'legend-b', 'legend-c', 'legend-d', 'legend-e']
  offered[position] = card.id
  return testPack('bora', { offered, ...overrides })
}

/**
 * The records of "Aboleth's Eyes": the DM gave it to Dana, who used it on Mira on 24 October; Bora drew it on
 * 28 October; the DM transferred it to Ayla on 2 November and discarded it on 5 November; it showed in Bora's Standard
 * Pack on 9 November without being chosen; Ayla chose it from her Premium Pack on 12 November and used it on Kael on
 * 14 November. Each use paid 1 LP.
 */
export function abolethHistory(): CardRecords {
  const card = ABOLETH
  const drawn = testDraw(card, 'bora', in2026(10, 28, 20, 30), { id: 'draw-bora' })
  const premium = packShowing(card, 2, {
    id: 'pack-premium',
    uid: 'ayla',
    by: 'ayla',
    at: ts(in2026(11, 12, 20, 30)),
    packType: 'premium',
    revealed: [0, 1, 2, 3, 4],
    status: 'chosen',
    closedAt: ts(in2026(11, 12, 20, 40)),
    closedBy: 'ayla',
    chosen: { cardId: card.id, cardName: card.name, cardKind: 'normal', holdingId: 'h-pack' },
  })
  const standard = packShowing(card, 1, {
    id: 'pack-standard',
    at: ts(in2026(11, 9, 20, 14)),
    revealed: [0, 1, 2, 3, 4],
    status: 'chosen',
    closedAt: ts(in2026(11, 9, 20, 20)),
    closedBy: 'bora',
    chosen: { cardId: 'legend-a', cardName: 'A', cardKind: 'normal', holdingId: 'h-other' },
  })
  return {
    holdings: [
      testHolding(card, 'dana', in2026(10, 20, 19, 45), {
        id: 'h-dm',
        returnedAt: ts(in2026(10, 24, 21, 10)),
        returnedBy: 'dana',
        returnReason: 'used',
        usedOn: 'Mira',
        useCost: 1,
        useEntryId: 'e-1',
      }),
      testHolding(card, 'bora', in2026(10, 28, 20, 30), {
        id: 'h-draw',
        givenBy: 'bora',
        givenVia: 'draw',
        drawId: 'draw-bora',
        returnedAt: ts(in2026(11, 2, 22, 2)),
        returnedBy: 'dm-1',
        returnReason: 'transferred',
        transferredTo: 'h-transfer',
      }),
      testHolding(card, 'ayla', in2026(11, 2, 22, 2), {
        id: 'h-transfer',
        givenVia: 'transfer',
        transferredFrom: 'h-draw',
        returnedAt: ts(in2026(11, 5, 20, 0)),
        returnedBy: 'dm-1',
        returnReason: 'discarded',
      }),
      testHolding(card, 'ayla', in2026(11, 12, 20, 40), {
        id: 'h-pack',
        givenBy: 'ayla',
        givenVia: 'pack',
        drawId: 'pack-premium',
        returnedAt: ts(in2026(11, 14, 21, 40)),
        returnedBy: 'ayla',
        returnReason: 'used',
        usedOn: 'Kael',
        useCost: 1,
        useEntryId: 'e-2',
      }),
    ],
    draws: [drawn],
    packs: [premium, standard],
  }
}
