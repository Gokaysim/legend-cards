import { render, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ready, signedInAs, testProfile, testUser } from '@/test/fixtures'
import { TestAuthProvider } from '@/test/TestAuthProvider'
import { TestDiceProvider } from '@/test/TestDiceProvider'
import { TestUsersProvider } from '@/test/TestUsersProvider'

import type * as Api from './api'
import { type CombatActions, useCombatActions } from './combatContext'
import { CombatProvider } from './CombatProvider'
import { CombatPartlyAddedError } from './errors'
import { IDLE_COMBAT } from './schema'

const subscribed = vi.hoisted(() => {
  const state: { targets: unknown[]; combat: unknown } = { targets: [], combat: null }
  return state
})
const api = vi.hoisted(() => ({ openCombat: vi.fn(), addCombatants: vi.fn() }))

vi.mock('@/lib/firebase/firestore', () => ({ db: { name: 'test-db' } }))
vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof Api>()),
  combatRef: () => 'combat/main',
  combatantsRef: () => 'combatants',
  dmCombatantsRef: () => 'dmCombatants',
  openCombat: api.openCombat,
  addCombatants: api.addCombatants,
}))
vi.mock('@/lib/firestore/useDocument', () => ({
  useDocument: (target: unknown) => {
    subscribed.targets.push(target)
    return { status: 'ready', data: subscribed.combat, fromCache: false, hasPendingWrites: false }
  },
}))
vi.mock('@/lib/firestore/useCollection', () => ({
  useCollection: (target: unknown) => {
    subscribed.targets.push(target)
    return { status: 'ready', data: [], fromCache: false, hasPendingWrites: false }
  },
}))

const captured: { actions: CombatActions | null } = { actions: null }

function Capture() {
  const actions = useCombatActions()
  useEffect(() => {
    captured.actions = actions
  })
  return null
}

function renderAs(role: 'player' | 'dm', rollWith = vi.fn()) {
  render(
    <TestAuthProvider state={signedInAs(testUser)}>
      <TestUsersProvider currentProfile={ready(testProfile({ role }))}>
        <TestDiceProvider actions={{ rollWith }}>
          <CombatProvider>
            <p>app</p>
            <Capture />
          </CombatProvider>
        </TestDiceProvider>
      </TestUsersProvider>
    </TestAuthProvider>,
  )
}

beforeEach(() => {
  subscribed.targets = []
  subscribed.combat = null
  captured.actions = null
  api.openCombat.mockReset()
  api.addCombatants.mockReset()
})

/** The actions once the provider has rendered. */
async function actions(): Promise<CombatActions> {
  await waitFor(() => expect(captured.actions).not.toBeNull())
  if (!captured.actions) throw new Error('No actions')
  return captured.actions
}

const goblins = { ids: ['g1', 'g2'], names: ['Goblin 1', 'Goblin 2'], modifier: 1 }
const thorn = { characterId: 'thorn', uid: 'ayla' }
const written = () => Promise.resolve({ roll: {}, written: Promise.resolve() })

describe('CombatProvider', () => {
  it("never subscribes to the NPCs' rolls on a player's device", () => {
    renderAs('player')
    expect(subscribed.targets).toContain('combat/main')
    expect(subscribed.targets).toContain('combatants')
    expect(subscribed.targets).not.toContain('dmCombatants')
  })

  it("subscribes to the NPCs' rolls on the DM's device", () => {
    renderAs('dm')
    expect(subscribed.targets).toContain('dmCombatants')
  })
})

describe('a setup cut short', () => {
  it('rolls the NPC groups, then reports the characters left out of a combat that opened', async () => {
    api.openCombat.mockResolvedValue({ combatId: 'c1', npcGroups: [goblins], leftOut: [thorn] })
    const rollWith = vi.fn(written)
    renderAs('dm', rollWith)
    const failure: unknown = await (
      await actions()
    )
      .open({ characters: [thorn], npcGroups: [] })
      .catch((e: unknown) => e)
    expect(rollWith).toHaveBeenCalledTimes(1)
    expect(failure).toBeInstanceOf(CombatPartlyAddedError)
    expect(failure).toMatchObject({ step: 'open', leftOut: [thorn] })
  })

  it('reports nothing when every character joined', async () => {
    api.openCombat.mockResolvedValue({ combatId: 'c1', npcGroups: [goblins], leftOut: [] })
    const rollWith = vi.fn(written)
    renderAs('dm', rollWith)
    await expect((await actions()).open({ characters: [thorn], npcGroups: [] })).resolves.toBe(
      undefined,
    )
    expect(rollWith).toHaveBeenCalledTimes(1)
  })

  it('rolls the added NPC groups, then reports the characters left out of an addition', async () => {
    subscribed.combat = { ...IDLE_COMBAT, phase: 'gathering', combatId: 'c1' }
    api.addCombatants.mockResolvedValue({ npcGroups: [goblins], leftOut: [thorn] })
    const rollWith = vi.fn(written)
    renderAs('dm', rollWith)
    const failure: unknown = await (
      await actions()
    )
      .add({ characters: [thorn], npcGroups: [] })
      .catch((e: unknown) => e)
    expect(rollWith).toHaveBeenCalledTimes(1)
    expect(failure).toMatchObject({ step: 'add', leftOut: [thorn] })

    api.addCombatants.mockResolvedValue({ npcGroups: [], leftOut: [] })
    await expect((await actions()).add({ characters: [thorn], npcGroups: [] })).resolves.toBe(
      undefined,
    )
  })
})
