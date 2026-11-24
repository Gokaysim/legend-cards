import {
  countsOf,
  formulaText,
  keptIndexes,
  modifierLabel,
  type NaturalMark,
  naturalMark,
  resultGroups,
  rollTotal,
  type DieType,
} from './formula'
import type { RollContent, RollPart } from './schema'

/** One result as the channel, the strip's fallback and the card show it. */
export type ResultView = {
  /** Unique in the whole roll: the indexes of its physical dice in the record. */
  key: string
  /** The die whose picture shows: a percentile pair shows the d100. */
  type: DieType
  value: number
  /** False for the d20 that advantage or disadvantage does not keep. */
  isKept: boolean
}

/** Everything a view shows of one part of a roll, always derived from its record (spec: "Results and the total"). */
export type PartView = {
  /** "1d20 + 5 · avantaj", or "1d20 + 5 + 10 − 4" with the fixed number as written */
  formula: string
  /** The fixed number after the dice: "+5 +10 −4", "+3", or empty for 0. */
  modifier: string
  results: ResultView[]
  total: number
  mark: NaturalMark | null
}

/**
 * Everything a view shows of a roll: one view per part, a single one for a roll of one part (design D7 of
 * add-multi-part-rolls). `mark` is the first part's mark that is not `null`: the one the natural sound plays.
 */
export type RollView = {
  parts: PartView[]
  mark: NaturalMark | null
}

const MODE_TEXT = { normal: '', advantage: ' · avantaj', disadvantage: ' · dezavantaj' } as const

function partView(content: RollContent, part: RollPart): PartView {
  const dice = content.dice.slice(part.start, part.start + part.count)
  const kept = new Set(keptIndexes(dice, content.mode))
  return {
    formula: `${formulaText(countsOf(dice, content.mode), part.modifier, part.modifierSum)}${MODE_TEXT[content.mode]}`,
    results: resultGroups(dice).map((group) => ({
      key: group.indexes.map((index) => index + part.start).join('-'),
      type: group.type,
      value: group.value,
      isKept: group.indexes.every((index) => kept.has(index)),
    })),
    modifier: modifierLabel(part.modifier, part.modifierSum),
    total: rollTotal(dice, content.mode, part.modifier),
    mark: naturalMark(dice, content.mode),
  }
}

export function rollView(content: RollContent): RollView {
  const parts = content.parts.map((part) => partView(content, part))
  return { parts, mark: parts.find((part) => part.mark !== null)?.mark ?? null }
}

export const NATURAL_MARK_TEXT: Record<NaturalMark, string> = {
  natural20: 'Nat 20',
  natural1: 'Nat 1',
}
