import {
  countsOf,
  formulaText,
  keptIndexes,
  type NaturalMark,
  naturalMark,
  resultGroups,
  rollTotal,
  type DieType,
} from './formula'
import type { RollContent } from './schema'

/** One result as the channel, the strip's fallback and the card show it. */
export type ResultView = {
  key: string
  /** The die whose picture shows: a percentile pair shows the d100. */
  type: DieType
  value: number
  /** False for the d20 that advantage or disadvantage does not keep. */
  isKept: boolean
}

/** Everything a view shows of a roll, always derived from its record (spec: "Results and the total"). */
export type RollView = {
  /** "1d20 + 5 · avantaj" */
  formula: string
  results: ResultView[]
  total: number
  mark: NaturalMark | null
}

const MODE_TEXT = { normal: '', advantage: ' · avantaj', disadvantage: ' · dezavantaj' } as const

export function rollView(content: RollContent): RollView {
  const kept = new Set(keptIndexes(content.dice, content.mode))
  return {
    formula: `${formulaText(countsOf(content.dice, content.mode), content.modifier)}${MODE_TEXT[content.mode]}`,
    results: resultGroups(content.dice).map((group) => ({
      key: group.indexes.join('-'),
      type: group.type,
      value: group.value,
      isKept: group.indexes.every((index) => kept.has(index)),
    })),
    total: rollTotal(content.dice, content.mode, content.modifier),
    mark: naturalMark(content.dice, content.mode),
  }
}

export const NATURAL_MARK_TEXT: Record<NaturalMark, string> = {
  natural20: 'Doğal 20',
  natural1: 'Doğal 1',
}
