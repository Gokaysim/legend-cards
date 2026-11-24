import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { testRoll } from '@/test/diceFixtures'

import { FlatDice, NaturalMarkLabel } from './FlatDice'
import { type PartView, rollView } from './rollView'
import type { RollContent } from './schema'

/** The view of a roll of one part. */
function partOf(content: RollContent): PartView {
  const part = rollView(content).parts[0]
  if (!part) throw new Error('A roll has a part')
  return part
}

function contentOf(roll: ReturnType<typeof testRoll>): RollContent {
  if (!roll.content) throw new Error('A roll without content')
  return roll.content
}

describe('FlatDice', () => {
  it("shows each die with its result in the roll's style", () => {
    const content = contentOf(testRoll({ content: { style: 'walnut' } }))
    render(<FlatDice view={partOf(content)} style="walnut" />)
    const dice = within(screen.getByRole('list', { name: 'Zarlar' })).getAllByRole('listitem')
    expect(dice.map((die) => die.textContent)).toEqual(['d20: 17', 'd6: 4', 'd6: 2'])
    for (const picture of screen.getByRole('list').querySelectorAll('img')) {
      expect(picture.getAttribute('src')).toContain('walnut')
    }
  })

  it('dims and strikes through the die that advantage does not keep', () => {
    const content = contentOf(
      testRoll({
        dice: [
          ['d20', 8],
          ['d20', 20],
        ],
        content: { mode: 'advantage', modifier: 5 },
      }),
    )
    const view = partOf(content)
    expect(view.total).toBe(25)
    render(<FlatDice view={view} style="galaxy" />)
    const [dropped, kept] = screen.getAllByRole('listitem')
    expect(dropped).toHaveAttribute('data-kept', 'false')
    expect(dropped).toHaveClass('line-through')
    expect(dropped).toHaveTextContent('(sayılmadı)')
    expect(kept).toHaveAttribute('data-kept', 'true')
    expect(kept).not.toHaveClass('line-through')
  })

  it('reads a percentile pair as one d100', () => {
    const content = contentOf(
      testRoll({
        dice: [
          ['d100', 30],
          ['d10', 7],
        ],
        content: { modifier: 0 },
      }),
    )
    render(<FlatDice view={partOf(content)} style="galaxy" />)
    expect(screen.getAllByRole('listitem').map((die) => die.textContent)).toEqual(['d100: 37'])
  })
})

describe('NaturalMarkLabel', () => {
  it('marks a natural 20 in gold', () => {
    const view = partOf(contentOf(testRoll({ dice: [['d20', 20]] })))
    render(<NaturalMarkLabel view={view} />)
    expect(screen.getByText('Nat 20')).toHaveClass('text-gold')
  })

  it('marks a natural 1 in red', () => {
    const view = partOf(contentOf(testRoll({ dice: [['d20', 1]] })))
    render(<NaturalMarkLabel view={view} />)
    expect(screen.getByText('Nat 1')).toHaveClass('text-cursed')
  })

  it('marks no 20 among other dice', () => {
    const view = partOf(
      contentOf(
        testRoll({
          dice: [
            ['d20', 20],
            ['d6', 3],
          ],
        }),
      ),
    )
    const { container } = render(<NaturalMarkLabel view={view} />)
    expect(container).toBeEmptyDOMElement()
  })
})
