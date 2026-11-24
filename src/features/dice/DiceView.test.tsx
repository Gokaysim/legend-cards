import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { testRoll } from '@/test/diceFixtures'

import { DiceView } from './DiceView'
import type { DieMotion } from './schema'

const webgl = vi.hoisted(() => ({ available: false }))

vi.mock('./webgl', () => ({ canDraw3d: () => webgl.available }))

// The 3D part, as it fails when its chunk or WebGL cannot load.
vi.mock('./stage/DiceStage', () => ({
  DiceStage: () => {
    throw new Error('WebGL context lost')
  },
}))

const still = { x: 0, y: 0, z: 0 }
const motion: DieMotion[] = [1, 2, 3].map(() => ({
  throw: {
    position: still,
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    linearVelocity: still,
    angularVelocity: still,
  },
  rest: { position: still, rotation: { x: 0, y: 0, z: 0, w: 1 } },
}))

beforeEach(() => {
  webgl.available = false
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('DiceView', () => {
  it('shows the results as numbers when the 3D part fails to load, and reports the rest', async () => {
    webgl.available = true
    const onRest = vi.fn()
    render(<DiceView roll={testRoll({ content: { motion } })} playing onRest={onRest} />)
    expect(await screen.findByTestId('flat-dice')).toHaveTextContent('17')
    expect(onRest).toHaveBeenCalled()
  })

  it('shows the dice flat without WebGL', () => {
    render(<DiceView roll={testRoll({ content: { motion } })} playing />)
    expect(screen.getByTestId('flat-dice')).toBeInTheDocument()
  })

  it('shows the dice flat at once with "Zarları 3D göster" off, without loading the 3D part', () => {
    webgl.available = true
    const onRest = vi.fn()
    render(
      <DiceView roll={testRoll({ content: { motion } })} playing show3d={false} onRest={onRest} />,
    )
    // At once, with no loading step: the lazy 3D part is never rendered.
    expect(screen.getByTestId('flat-dice')).toHaveTextContent('17')
    expect(screen.queryByText('Zarlar yükleniyor')).not.toBeInTheDocument()
    expect(onRest).toHaveBeenCalledTimes(1)
  })

  it('shows up to twelve results large, and more at the smaller size', () => {
    const { unmount } = render(<DiceView roll={testRoll()} playing />)
    expect(screen.getByTestId('flat-dice')).toHaveAttribute('data-size', 'lg')
    unmount()
    const sixty = Array.from({ length: 60 }, (_, index): ['d6', number] => ['d6', (index % 6) + 1])
    render(<DiceView roll={testRoll({ dice: sixty })} playing />)
    expect(screen.getByTestId('flat-dice')).toHaveAttribute('data-size', 'sm')
    expect(screen.getAllByRole('listitem')).toHaveLength(60)
  })

  it('groups the results by part without 3D (spec: dice-rolls, "Parts without 3D")', () => {
    const roll = testRoll({
      dice: [
        ['d20', 14],
        ['d6', 2],
        ['d6', 5],
      ],
      content: {
        modifier: 0,
        parts: [
          { start: 0, count: 1, modifier: 5, modifierSum: null },
          { start: 1, count: 2, modifier: 0, modifierSum: null },
        ],
      },
    })
    render(<DiceView roll={roll} playing show3d={false} />)
    const groups = screen.getAllByTestId('flat-part')
    expect(groups.map((group) => group.textContent)).toEqual(['d20: 14', 'd6: 2d6: 5'])
  })

  it('shows a roll without motion flat', () => {
    webgl.available = true
    const onRest = vi.fn()
    render(<DiceView roll={testRoll()} playing onRest={onRest} />)
    expect(screen.getByTestId('flat-dice')).toHaveTextContent('4')
    expect(onRest).toHaveBeenCalledTimes(1)
  })
})
