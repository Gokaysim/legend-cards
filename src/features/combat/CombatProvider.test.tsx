import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ready, signedInAs, testProfile, testUser } from '@/test/fixtures'
import { TestAuthProvider } from '@/test/TestAuthProvider'
import { TestDiceProvider } from '@/test/TestDiceProvider'
import { TestUsersProvider } from '@/test/TestUsersProvider'

import type * as Api from './api'
import { CombatProvider } from './CombatProvider'

const subscribed = vi.hoisted(() => ({ targets: [] as unknown[] }))

vi.mock('@/lib/firebase/firestore', () => ({ db: { name: 'test-db' } }))
vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof Api>()),
  combatRef: () => 'combat/main',
  combatantsRef: () => 'combatants',
  dmCombatantsRef: () => 'dmCombatants',
}))
vi.mock('@/lib/firestore/useDocument', () => ({
  useDocument: (target: unknown) => {
    subscribed.targets.push(target)
    return { status: 'ready', data: null, fromCache: false, hasPendingWrites: false }
  },
}))
vi.mock('@/lib/firestore/useCollection', () => ({
  useCollection: (target: unknown) => {
    subscribed.targets.push(target)
    return { status: 'ready', data: [], fromCache: false, hasPendingWrites: false }
  },
}))

function renderAs(role: 'player' | 'dm') {
  render(
    <TestAuthProvider state={signedInAs(testUser)}>
      <TestUsersProvider currentProfile={ready(testProfile({ role }))}>
        <TestDiceProvider>
          <CombatProvider>
            <p>app</p>
          </CombatProvider>
        </TestDiceProvider>
      </TestUsersProvider>
    </TestAuthProvider>,
  )
}

beforeEach(() => {
  subscribed.targets = []
})

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
