import type { Card } from '@/features/cards/schema'
import { cryptoRandom, pickRandom, type RandomSource, sample, shuffle } from '@/lib/random'

import { type PackDef, packPools, packStatus } from './catalog'

/** How many cards a pack shows besides the Cursed card of a Cursed type. */
const PACK_CARDS = 5

/**
 * The cards a pack shows, as card IDs in the order shown, or `null` when the pool no longer has enough cards for
 * it (`packStatus`). Each candidate has the same chance in its part of the pack, and no card is shown twice:
 * - a Premium Pack's first card is one of its set's Rares, and its other 4 any other cards of the set
 * - every other pack's 5 cards come from its candidates (`packPools`), Blessed cards included where they belong
 * - a Cursed type adds 1 card of the Cursed Deck
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
  let shown: Card[]
  if (pools.slot !== null) {
    const [rare] = sample(pools.slot, 1, random)
    if (rare === undefined) return null
    const others = pools.cards.filter((card) => card.id !== rare.id)
    shown = [rare, ...sample(others, PACK_CARDS - 1, random)]
  } else {
    shown = sample(pools.cards, PACK_CARDS, random)
  }
  if (shown.length < PACK_CARDS) return null
  if (pools.cursed !== null) {
    const curse = pickRandom(pools.cursed, random)
    if (curse === null) return null
    shown.push(curse)
  }
  return shuffle(shown, random).map((card) => card.id)
}
