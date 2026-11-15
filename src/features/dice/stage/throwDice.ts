import { randomUnit } from '@/lib/random'

import type { DieType } from '../formula'
import type { DiceStyle, DieMotion } from '../schema'
import { makeThrows, type UnitSource } from './owlbear/throws'
import { loadPhysics, simulateThrow } from './simulate'
import { rememberSimulation } from './simulationCache'

export type Thrown = { values: number[]; motion: DieMotion[] }

/**
 * The roller's throw (design D2, D3): random throws from the cryptographic source, simulated once on this device. The
 * results and the motion go into the record; the simulation is kept for the roll's own playback. Loaded lazily, with
 * Rapier, by the dice api.
 */
export async function throwDice(
  dice: readonly DieType[],
  style: DiceStyle,
  rollId: string,
  random: UnitSource = () => randomUnit(),
): Promise<Thrown> {
  await loadPhysics()
  const throws = makeThrows(dice, random)
  const simulation = simulateThrow(dice, style, throws)
  rememberSimulation(rollId, simulation)
  return {
    values: simulation.values,
    motion: throws.map((dieThrow, index) => ({
      throw: dieThrow,
      rest: simulation.rests[index] as DieMotion['rest'],
    })),
  }
}
