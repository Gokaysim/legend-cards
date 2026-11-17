import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { testRoll } from '@/test/diceFixtures'
import { stubMedia } from '@/test/media'

import { DiceView } from './DiceView'
import type { DieMotion } from './schema'
import type { DiceStageProps } from './stage/DiceStage'

vi.mock('./webgl', () => ({ canDraw3d: () => true }))

// The 3D part, reduced to the props it gets.
vi.mock('./stage/DiceStage', () => ({
  DiceStage: ({ playing }: DiceStageProps) => (
    <p data-testid="stage">{playing ? 'plays' : 'at rest'}</p>
  ),
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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('dice without motion', () => {
  it('plays the throw on a device that allows motion', async () => {
    stubMedia()
    render(<DiceView roll={testRoll({ content: { motion } })} playing />)
    expect(await screen.findByTestId('stage')).toHaveTextContent(/^plays$/)
  })

  it('shows the dice at rest at once with reduced motion', async () => {
    stubMedia('(prefers-reduced-motion: reduce)')
    render(<DiceView roll={testRoll({ content: { motion } })} playing />)
    expect(await screen.findByTestId('stage')).toHaveTextContent(/^at rest$/)
  })
})
