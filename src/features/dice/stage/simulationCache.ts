import type { Simulation } from './simulate'

/**
 * The simulations this device already ran, by roll ID: the roller's own throw, and every roll the stage played. The
 * stage then never simulates a roll twice (design D7). Small, so it is never cleared.
 */
const simulations = new Map<string, Simulation>()

/** Keeps at most this many simulations, dropping the oldest. */
const MAX_SIMULATIONS = 30

export function rememberSimulation(rollId: string, simulation: Simulation): void {
  simulations.delete(rollId)
  simulations.set(rollId, simulation)
  if (simulations.size > MAX_SIMULATIONS) {
    const oldest = simulations.keys().next().value
    if (oldest !== undefined) simulations.delete(oldest)
  }
}

export function rememberedSimulation(rollId: string): Simulation | null {
  return simulations.get(rollId) ?? null
}
