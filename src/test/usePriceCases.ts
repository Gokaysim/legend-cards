/**
 * One table of written costs, for the unit tests of `priceOfUse` and the emulator tests of the rules' `priceAllows`
 * (design D3 of `pay-lp-on-use`): the price each cost reads as, the amounts the rules accept, and amounts they deny.
 * The rules tests in `tests/` import it without the `@/` alias, so it imports nothing; `price` has the shape of
 * `UsePrice` in `src/features/cards/display.ts`.
 */
export type UsePriceCase = {
  cost: string | null
  price: { kind: 'fixed'; amount: number } | { kind: 'die' } | { kind: 'chosen' }
  allowed: readonly number[]
  denied: readonly number[]
}

export const USE_PRICE_CASES: readonly UsePriceCase[] = [
  { cost: null, price: { kind: 'fixed', amount: 0 }, allowed: [0], denied: [1] },
  { cost: '', price: { kind: 'fixed', amount: 0 }, allowed: [0], denied: [1] },
  { cost: '0', price: { kind: 'fixed', amount: 0 }, allowed: [0], denied: [1] },
  { cost: '2', price: { kind: 'fixed', amount: 2 }, allowed: [2], denied: [0, 1, 3] },
  { cost: ' 3 ', price: { kind: 'fixed', amount: 3 }, allowed: [3], denied: [2] },
  { cost: '6', price: { kind: 'fixed', amount: 6 }, allowed: [6], denied: [5] },
  { cost: 'd6', price: { kind: 'die' }, allowed: [1, 6], denied: [0, 7] },
  { cost: 'D6', price: { kind: 'die' }, allowed: [4], denied: [0, 7] },
  { cost: 'X', price: { kind: 'chosen' }, allowed: [0, 3], denied: [-1] },
  { cost: 'X+1', price: { kind: 'chosen' }, allowed: [0, 4], denied: [-1] },
  { cost: '-1', price: { kind: 'chosen' }, allowed: [0, 1], denied: [-1] },
  { cost: '1,5', price: { kind: 'chosen' }, allowed: [0, 2], denied: [-1] },
]
