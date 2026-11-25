import type { Card } from '@/features/cards/schema'
import {
  cryptoRandom,
  pickRandom,
  type RandomSource,
  randomIndex,
  sample,
  shuffle,
} from '@/lib/random'

import { type PackDef, packPools, packStatus } from './catalog'

/** How many cards a pack shows besides the Cursed card of a Cursed type. */
const PACK_CARDS = 5

/** Each card of a pack that can show Blessed cards is Blessed with a chance of 1 in this many: 2%. */
export const BLESSED_ODDS = 50

/** How many of the pack's cards roll Blessed: each of them on its own, with a chance of exactly 1 in `BLESSED_ODDS`. */
function blessedRolls(random: RandomSource): number {
  let hits = 0
  for (let card = 0; card < PACK_CARDS; card += 1) {
    if (randomIndex(BLESSED_ODDS, random) === 0) hits += 1
  }
  return hits
}

/**
 * The cards a pack shows, as card IDs in the order shown, or `null` when the pool no longer has enough cards for
 * it (`packStatus`). No card is shown twice, and each candidate has the same chance in its part of the pack:
 * - in the packs that can show Blessed cards (a one-pack set's Pack, the Golden Pack, a Mechanic Pack), each of the 5
 *   cards rolls Blessed with a 2% chance on its own; a card that rolls Blessed is one of the pack's Blessed cards,
 *   or an ordinary candidate when none is left (spec: pack-shop, "Blessed cards come at 2% per card")
 * - a Premium Pack's first card is one of its set's Rares, and its other 4 any other cards of the set
 * - the other cards come from the pack's candidates (`packPools`), which never hold a Blessed card
 * - a Cursed type adds 1 card of the Cursed Deck, and shows no Blessed card
 *
 * The result is shuffled, so a card's place tells nothing about it. A pure function of the cards and the random
 * source, so a server function could build the same pack later.
 */
export function buildPack(
  def: PackDef,
  cards: readonly Card[],
  random: RandomSource = cryptoRandom,
): string[] | null {
  if (!packStatus(def, cards).canOpen) return null
  const pools = packPools(def, cards)
  const shown: Card[] =
    pools.blessed === null ? [] : sample(pools.blessed, blessedRolls(random), random)
  let others = pools.cards
  if (pools.slot !== null) {
    const [rare] = sample(pools.slot, 1, random)
    if (rare === undefined) return null
    shown.push(rare)
    others = others.filter((card) => card.id !== rare.id)
  }
  shown.push(...sample(others, PACK_CARDS - shown.length, random))
  if (shown.length < PACK_CARDS) return null
  if (pools.cursed !== null) {
    const curse = pickRandom(pools.cursed, random)
    if (curse === null) return null
    shown.push(curse)
  }
  return shuffle(shown, random).map((card) => card.id)
}
