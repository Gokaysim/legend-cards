import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, type Firestore, getDocs, setDoc, Timestamp } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import firestoreRules from '../../../firestore.rules?raw'
import { cardsRef, playerVisibleCardsQuery } from './api'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

const storedCard = (name: string, nameKey: string, status: 'active' | 'retired' | 'draft') => ({
  kind: 'cursed',
  name,
  nameKey,
  setCode: null,
  cost: '1',
  rarity: null,
  mechanicPack: null,
  text: 'Bad luck.',
  status,
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
  // Seeded with the rules disabled: Bob is a player and Dana the DM, with an active, a retired and a draft card.
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    const user = (role: string) => ({
      displayName: role,
      photoURL: null,
      role,
      createdAt: Timestamp.fromMillis(0),
    })
    await setDoc(doc(db, 'users/bob'), user('player'))
    await setDoc(doc(db, 'users/dana'), user('dm'))
    await setDoc(doc(db, 'cards/cursed-hex'), storedCard('Hex', 'hex', 'active'))
    await setDoc(doc(db, 'cards/cursed-oldcurse'), storedCard('Old Curse', 'oldcurse', 'retired'))
    await setDoc(doc(db, 'cards/cursed-newcurse'), storedCard('New Curse', 'newcurse', 'draft'))
  })
})

const ids = (cards: { id: string }[]) => cards.map((card) => card.id).sort()

describe('reading the cards under the real rules', () => {
  it("gives a player's query the active and retired cards, validated, and never a draft", async () => {
    const snapshot = await getDocs(
      playerVisibleCardsQuery(firestoreOf(testEnv.authenticatedContext('bob'))),
    )

    expect(snapshot.docs.map((document) => document.data())).toEqual([
      {
        id: 'cursed-hex',
        ...storedCard('Hex', 'hex', 'active'),
        holder: null,
        changeId: null,
        picture: null,
        dmOnly: false,
      },
      {
        id: 'cursed-oldcurse',
        ...storedCard('Old Curse', 'oldcurse', 'retired'),
        holder: null,
        changeId: null,
        picture: null,
        dmOnly: false,
      },
    ])
  })

  it('refuses a player the whole collection', async () => {
    await expect(
      getDocs(cardsRef(firestoreOf(testEnv.authenticatedContext('bob')))),
    ).rejects.toThrow()
  })

  it('gives the DM every card, the drafts included', async () => {
    const snapshot = await getDocs(cardsRef(firestoreOf(testEnv.authenticatedContext('dana'))))
    expect(ids(snapshot.docs.map((document) => document.data()))).toEqual([
      'cursed-hex',
      'cursed-newcurse',
      'cursed-oldcurse',
    ])
  })
})
