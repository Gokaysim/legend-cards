/** A source of random whole numbers from 0 to 2^32 − 1, each equally likely. */
export type RandomSource = () => number

const RANGE = 2 ** 32

/** The browser's cryptographic random numbers. */
export const cryptoRandom: RandomSource = () => {
  const [value = 0] = crypto.getRandomValues(new Uint32Array(1))
  return value
}

/**
 * A whole number from 0 to `count` − 1, each equally likely. A plain `value % count` would favor the low numbers
 * whenever 2^32 is not a multiple of `count`, so values from the incomplete top range are drawn again.
 */
export function randomIndex(count: number, random: RandomSource = cryptoRandom): number {
  const limit = RANGE - (RANGE % count)
  for (;;) {
    const value = random()
    if (value < limit) return value % count
  }
}

/**
 * One item, each with the same chance, or `null` from an empty list. A pure function of the list and the random
 * source, so a server function could make the same pick later.
 */
export function pickRandom<T>(items: readonly T[], random: RandomSource = cryptoRandom): T | null {
  if (items.length === 0) return null
  return items[randomIndex(items.length, random)] ?? null
}

/**
 * `n` distinct items of the list, each with the same chance, in random order (a partial Fisher-Yates shuffle).
 * Returns every item, shuffled, when `n` is the list's length or more.
 */
export function sample<T>(
  items: readonly T[],
  n: number,
  random: RandomSource = cryptoRandom,
): T[] {
  const pool = [...items]
  const count = Math.min(Math.max(n, 0), pool.length)
  for (let index = 0; index < count; index += 1) {
    const swap = index + randomIndex(pool.length - index, random)
    const item = pool[swap] as T
    pool[swap] = pool[index] as T
    pool[index] = item
  }
  return pool.slice(0, count)
}

/** The items in random order, each order equally likely. */
export function shuffle<T>(items: readonly T[], random: RandomSource = cryptoRandom): T[] {
  return sample(items, items.length, random)
}

/** A number from 0 (included) to 1 (excluded), from one 32-bit draw: enough for a die's throw. */
export function randomUnit(random: RandomSource = cryptoRandom): number {
  return random() / RANGE
}
