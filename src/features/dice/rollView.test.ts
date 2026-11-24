import { describe, expect, it } from 'vitest'

import { testRoll } from '@/test/diceFixtures'

import { rollView } from './rollView'
import type { RollContent } from './schema'

function contentOf(roll: ReturnType<typeof testRoll>): RollContent {
  if (!roll.content) throw new Error('A test roll with content')
  return roll.content
}

/** "1d20 + 5; 2d6 + 3" showing 12, then 4 and 6. */
const attackAndDamage = () =>
  contentOf(
    testRoll({
      dice: [
        ['d20', 12],
        ['d6', 4],
        ['d6', 6],
      ],
      content: {
        modifier: 0,
        parts: [
          { start: 0, count: 1, modifier: 5, modifierSum: null },
          { start: 1, count: 2, modifier: 3, modifierSum: null },
        ],
      },
    }),
  )

describe('rollView (spec: dice-rolls, "Results and the total")', () => {
  it('shows a roll of one part as before', () => {
    const view = rollView(contentOf(testRoll()))
    expect(view.parts).toHaveLength(1)
    expect(view.parts[0]).toMatchObject({ formula: '1d20 + 2d6 + 3', modifier: '+3', total: 26 })
    expect(view.parts[0]?.results.map((result) => result.value)).toEqual([17, 4, 2])
    expect(view.mark).toBeNull()
  })

  it('keeps the fixed number as written and the mode in one part', () => {
    const view = rollView(
      contentOf(
        testRoll({
          dice: [
            ['d20', 20],
            ['d20', 8],
          ],
          content: { mode: 'advantage', modifier: 11, modifierSum: '5+10-4' },
        }),
      ),
    )
    expect(view.parts[0]).toMatchObject({
      formula: '1d20 + 5 + 10 − 4 · avantaj',
      modifier: '+5 +10 −4',
      total: 31,
      mark: 'natural20',
    })
    expect(view.parts[0]?.results.map((result) => result.isKept)).toEqual([true, false])
    expect(view.mark).toBe('natural20')
  })

  it('totals each part on its own (spec: dice-rolls, "Totals of parts")', () => {
    const view = rollView(attackAndDamage())
    expect(view.parts.map((part) => part.formula)).toEqual(['1d20 + 5', '2d6 + 3'])
    expect(view.parts.map((part) => part.total)).toEqual([17, 13])
  })

  it('keeps result keys unique across parts', () => {
    const keys = rollView(attackAndDamage()).parts.flatMap((part) =>
      part.results.map((result) => result.key),
    )
    expect(keys).toEqual(['0', '1', '2'])
  })

  it('marks each part on its own (spec: dice-rolls, "A natural in one part")', () => {
    const view = rollView(
      contentOf(
        testRoll({
          dice: [
            ['d20', 20],
            ['d20', 20],
            ['d4', 3],
          ],
          content: {
            modifier: 0,
            parts: [
              { start: 0, count: 1, modifier: 5, modifierSum: null },
              { start: 1, count: 2, modifier: 9, modifierSum: null },
            ],
          },
        }),
      ),
    )
    expect(view.parts.map((part) => part.mark)).toEqual(['natural20', null])
    expect(view.parts.map((part) => part.total)).toEqual([25, 32])
  })

  it("gives the roll its first part's mark", () => {
    const view = rollView(
      contentOf(
        testRoll({
          dice: [
            ['d20', 1],
            ['d20', 20],
          ],
          content: {
            modifier: 0,
            parts: [
              { start: 0, count: 1, modifier: 0, modifierSum: null },
              { start: 1, count: 1, modifier: 0, modifierSum: null },
            ],
          },
        }),
      ),
    )
    expect(view.parts.map((part) => part.mark)).toEqual(['natural1', 'natural20'])
    expect(view.mark).toBe('natural1')
  })

  it('reads a percentile pair inside a later part as one d100', () => {
    const view = rollView(
      contentOf(
        testRoll({
          dice: [
            ['d6', 2],
            ['d100', 30],
            ['d10', 7],
          ],
          content: {
            modifier: 0,
            parts: [
              { start: 0, count: 1, modifier: 0, modifierSum: null },
              { start: 1, count: 2, modifier: 0, modifierSum: null },
            ],
          },
        }),
      ),
    )
    expect(view.parts[1]).toMatchObject({ formula: '1d100', total: 37 })
    expect(view.parts[1]?.results[0]?.key).toBe('1-2')
  })
})
