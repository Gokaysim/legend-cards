import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, type Firestore, getDocs, setDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import firestoreRules from '../../../firestore.rules?raw'
import { activeCardsQuery } from './api'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

const storedCard = (name: string, nameKey: string, retired: boolean) => ({
  kind: 'cursed',
  name,
  nameKey,
  setCode: null,
  cost: '1',
  rarity: null,
  mechanicPack: null,
  text: 'Bad luck.',
  retired,
})

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-legend-cards',
    firestore: { host: '127.0.0.1', port: 8080, rules: firestoreRules },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  // Cards are written only by the import script, so they are seeded with the rules disabled.
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    await setDoc(doc(db, 'cards/cursed-hex'), storedCard('Hex', 'hex', false))
    await setDoc(doc(db, 'cards/cursed-oldcurse'), storedCard('Old Curse', 'oldcurse', true))
  })
})

describe('activeCardsQuery under the real rules', () => {
  it('returns only the cards that are not retired, validated and with their IDs', async () => {
    const db = firestoreOf(testEnv.authenticatedContext('alice'))

    const snapshot = await getDocs(activeCardsQuery(db))

    expect(snapshot.docs.map((document) => document.data())).toEqual([
      { id: 'cursed-hex', ...storedCard('Hex', 'hex', false) },
    ])
  })
})
