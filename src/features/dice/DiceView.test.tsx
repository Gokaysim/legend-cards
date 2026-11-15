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
    render(
      <DiceView roll={testRoll({ content: { motion } })} variant="strip" playing onRest={onRest} />,
    )
    expect(await screen.findByTestId('flat-dice')).toHaveTextContent('17')
    expect(onRest).toHaveBeenCalled()
  })

  it('shows the dice flat without WebGL', () => {
    render(<DiceView roll={testRoll({ content: { motion } })} variant="card" playing />)
    expect(screen.getByTestId('flat-dice')).toBeInTheDocument()
  })

  it('shows a roll without motion flat', () => {
    webgl.available = true
    const onRest = vi.fn()
    render(<DiceView roll={testRoll()} variant="strip" playing onRest={onRest} />)
    expect(screen.getByTestId('flat-dice')).toHaveTextContent('4')
    expect(onRest).toHaveBeenCalledTimes(1)
  })
})
