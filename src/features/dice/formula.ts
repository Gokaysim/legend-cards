/**
 * The dice of a roll and how its results count (spec: dice-rolls, "Building a roll" to "Natural 20 and natural 1").
 * Pure functions, shared by the form, the channel, the strip and the notification card.
 */

/** The dice a roll can hold. In a record, `d100` is the tens die of a percentile pair, always followed by its `d10`. */
export const DIE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'] as const
export type DieType = (typeof DIE_TYPES)[number]

/** The order in which a formula names its dice. */
export const FORMULA_ORDER: readonly DieType[] = ['d20', 'd12', 'd10', 'd8', 'd6', 'd4', 'd100']

/** At most this many physical dice per roll. A d100 counts as two. */
export const MAX_DICE = 12
export const MODIFIER_MIN = -99
export const MODIFIER_MAX = 99
export const NOTE_MAX = 80

/**
 * The longest fixed number the roll form takes, as typed, and the longest written sum a record holds: eight numbers
 * of two digits with their signs. Keep in step with `firestore.rules` (validRoll).
 */
export const MODIFIER_TEXT_MAX = 24

/** The most numbers a written sum holds, and the largest of them (spec: dice-rolls, "A fixed number written as a sum"). */
export const MODIFIER_TERMS_MAX = 8
export const MODIFIER_TERM_MAX = 99

/** The fixed number as the roll form reads it: its total, and the written sum when it has two or more numbers. */
export type ParsedModifier = {
  total: number
  /** The canonical written sum, such as "5+10-4": no spaces, ASCII minus, no leading plus. `null` for one number. */
  sum: string | null
}

/**
 * The fixed number as typed (design D3 of dice-sum-modifier-and-nat-marks): one whole number, or whole numbers joined
 * by + and −, such as "5+10-4". Each number is from 0 to 99, at most eight of them, and the total from −99 to +99.
 * Spaces are ignored, "−" and "–" read as minus, and an empty field is 0. `null` for anything else.
 */
export function parseModifier(text: string): ParsedModifier | null {
  // Spaces go only around the signs, so "4 4" stays two numbers without a sign and is refused.
  const compact = text
    .replace(/[−–]/g, '-')
    .replace(/\s*([+-])\s*/g, '$1')
    .trim()
  if (compact === '') return { total: 0, sum: null }
  if (!/^[+-]?\d+(?:[+-]\d+)*$/.test(compact)) return null
  const terms = (compact.match(/[+-]?\d+/g) ?? []).map((part) => ({
    isNegative: part.startsWith('-'),
    value: Number(part.replace(/^[+-]/, '')),
  }))
  if (terms.length > MODIFIER_TERMS_MAX) return null
  if (terms.some((term) => term.value > MODIFIER_TERM_MAX)) return null
  const total = terms.reduce((sum, term) => sum + (term.isNegative ? -term.value : term.value), 0)
  if (total < MODIFIER_MIN || total > MODIFIER_MAX) return null
  if (terms.length === 1) return { total, sum: null }
  const sum = terms
    .map((term, index) => `${term.isNegative ? '-' : index === 0 ? '' : '+'}${term.value}`)
    .join('')
  return { total, sum }
}

/**
 * A record's written sum, canonical, when it parses and adds up to its fixed number; otherwise `null`, and the fixed
 * number shows alone (design D2: the rules check only the sum's shape).
 */
export function checkedModifierSum(
  modifier: number,
  sum: string | null | undefined,
): string | null {
  if (!sum) return null
  const parsed = parseModifier(sum)
  return parsed?.sum && parsed.total === modifier ? parsed.sum : null
}

/** The numbers the fixed number shows as, signed: the written sum's, or the fixed number alone, or none for 0. */
export function modifierTerms(modifier: number, sum: string | null = null): number[] {
  const checked = checkedModifierSum(modifier, sum)
  if (checked) return (checked.match(/[+-]?\d+/g) ?? []).map(Number)
  return modifier === 0 ? [] : [modifier]
}

/** The fixed number after the dice: "+5 +10 −4", "+3", or empty for 0. */
export function modifierLabel(modifier: number, sum: string | null = null): string {
  return modifierTerms(modifier, sum)
    .map((term) => (term < 0 || Object.is(term, -0) ? `−${Math.abs(term)}` : `+${term}`))
    .join(' ')
}

/** The highest face of each die. The d100 tens die shows 00 to 90. Shared with `firestore.rules` (dieAt). */
export const DIE_MAX: Record<DieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
  d100: 90,
}

export const ROLL_MODES = ['normal', 'advantage', 'disadvantage'] as const
export type RollMode = (typeof ROLL_MODES)[number]

/** How many dice of each type a formula holds. A d100 here is the whole percentile pair. */
export type DiceCounts = Record<DieType, number>

/** One physical die of a record: its type and the face it shows. */
export type RolledDie = { t: DieType; v: number }

export function emptyCounts(): DiceCounts {
  return { d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 }
}

function physicalSize(type: DieType): number {
  return type === 'd100' ? 2 : 1
}

/** The physical dice a formula throws. */
export function physicalCount(counts: DiceCounts): number {
  return DIE_TYPES.reduce((sum, type) => sum + counts[type] * physicalSize(type), 0)
}

/** Whether one more die of this type still fits in the roll. */
export function canAdd(counts: DiceCounts, type: DieType): boolean {
  return physicalCount(counts) + physicalSize(type) <= MAX_DICE
}

/** Whether the formula holds exactly one d20 and no other die: only then are Avantaj and Dezavantaj offered. */
export function isSingleD20(counts: DiceCounts): boolean {
  return counts.d20 === 1 && physicalCount(counts) === 1
}

/** The fixed number as a formula writes it: " + 3", " − 2", " + 5 + 10 − 4" for a written sum, or nothing for 0. */
export function modifierText(modifier: number, sum: string | null = null): string {
  return modifierTerms(modifier, sum)
    .map((term) => (term < 0 || Object.is(term, -0) ? ` − ${Math.abs(term)}` : ` + ${term}`))
    .join('')
}

/**
 * "1d20 + 2d6 + 3": each type once with its count, in `FORMULA_ORDER`, then the fixed number, or its written sum when
 * it adds up ("1d20 + 5 + 10 − 4"). Empty without dice.
 */
export function formulaText(
  counts: DiceCounts,
  modifier: number,
  sum: string | null = null,
): string {
  const dice = FORMULA_ORDER.filter((type) => counts[type] > 0).map(
    (type) => `${counts[type]}${type}`,
  )
  if (dice.length === 0) return ''
  return `${dice.join(' + ')}${modifierText(modifier, sum)}`
}

/**
 * The physical dice a formula throws, in throw order (`FORMULA_ORDER`). A d100 throws its tens die and then its d10.
 * Advantage and disadvantage throw two d20.
 */
export function physicalDice(counts: DiceCounts, mode: RollMode): DieType[] {
  if (mode !== 'normal' && isSingleD20(counts)) return ['d20', 'd20']
  return FORMULA_ORDER.flatMap((type) =>
    Array.from({ length: counts[type] }, () =>
      type === 'd100' ? (['d100', 'd10'] as const) : [type],
    ).flat(),
  )
}

/** The formula a record's dice make: a percentile pair counts as one d100, and advantage's two d20 as one. */
export function countsOf(dice: readonly RolledDie[], mode: RollMode): DiceCounts {
  const counts = emptyCounts()
  for (const group of resultGroups(dice)) counts[group.type] += 1
  if (mode !== 'normal' && counts.d20 === 2) counts.d20 = 1
  return counts
}

/** A d100 from its tens die (0 to 90) and its d10 (1 to 10, where 10 is the "0" face). 00 and 0 read 100. */
export function percentileValue(tens: number, ones: number): number {
  const value = tens + (ones % 10)
  return value === 0 ? 100 : value
}

/** One result as the channel shows it: a single die, or a percentile pair read as one d100. */
export type ResultGroup = {
  type: DieType
  value: number
  /** The physical dice of the group, by index in the record. */
  indexes: number[]
}

/** The record's dice as results: each die alone, except a tens die and the d10 after it, which read as one d100. */
export function resultGroups(dice: readonly RolledDie[]): ResultGroup[] {
  const groups: ResultGroup[] = []
  for (let index = 0; index < dice.length; index += 1) {
    const die = dice[index] as RolledDie
    const next = dice[index + 1]
    if (die.t === 'd100' && next?.t === 'd10') {
      groups.push({
        type: 'd100',
        value: percentileValue(die.v, next.v),
        indexes: [index, index + 1],
      })
      index += 1
    } else {
      groups.push({ type: die.t, value: die.v, indexes: [index] })
    }
  }
  return groups
}

/**
 * The indexes of the dice that count. Advantage keeps the higher of the two d20 and disadvantage the lower (the first
 * on a tie); a normal roll keeps every die.
 */
export function keptIndexes(dice: readonly RolledDie[], mode: RollMode): number[] {
  const [first, second] = dice
  if (mode === 'normal' || dice.length !== 2 || !first || !second)
    return dice.map((_, index) => index)
  const keepFirst = mode === 'advantage' ? first.v >= second.v : first.v <= second.v
  return [keepFirst ? 0 : 1]
}

/** The total: the kept results plus the fixed number. Always computed from the record, never stored. */
export function rollTotal(dice: readonly RolledDie[], mode: RollMode, modifier: number): number {
  const kept = new Set(keptIndexes(dice, mode))
  const sum = resultGroups(dice)
    .filter((group) => group.indexes.every((index) => kept.has(index)))
    .reduce((total, group) => total + group.value, 0)
  return sum + modifier
}

export type NaturalMark = 'natural20' | 'natural1'

/** "Nat 20" or "Nat 1", when the roll's only kept die is a d20 showing 20 or 1. */
export function naturalMark(dice: readonly RolledDie[], mode: RollMode): NaturalMark | null {
  const kept = keptIndexes(dice, mode)
  if (kept.length !== 1) return null
  const die = dice[kept[0] as number]
  if (die?.t !== 'd20') return null
  if (die.v === 20) return 'natural20'
  if (die.v === 1) return 'natural1'
  return null
}
