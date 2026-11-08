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
