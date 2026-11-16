import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, type Firestore, getDocs, setDoc, Timestamp } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { startingFlags } from '@/features/definitions/flags'
import { memberContext, seedMembers } from '@/test/members'

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
  ...startingFlags('cursed', ''),
})

/** A stored True Word: one definition among the cards (design D1 of unify-cards-and-true-words). */
const storedWord = {
  kind: 'trueWord',
  name: 'Abyss',
  nameKey: 'abyss',
  setCode: null,
  cost: '5',
  rarity: null,
  mechanicPack: null,
  text: 'A random card is free.',
  status: 'active',
  ...startingFlags('trueWord', ''),
}

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
  await seedMembers(testEnv)
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
      playerVisibleCardsQuery(firestoreOf(memberContext(testEnv, 'bob'))),
    )

    expect(snapshot.docs.map((document) => document.data())).toEqual([
      {
        id: 'cursed-hex',
        ...storedCard('Hex', 'hex', 'active'),
        holder: null,
        changeId: null,
        picture: null,
      },
      {
        id: 'cursed-oldcurse',
        ...storedCard('Old Curse', 'oldcurse', 'retired'),
        holder: null,
        changeId: null,
        picture: null,
      },
    ])
  })

  it("gives a player's query a card hidden from the list and a True Word, which hands need", async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await setDoc(doc(db, 'cards/cursed-hex'), {
        ...storedCard('Hex', 'hex', 'active'),
        isInLibrary: false,
      })
      await setDoc(doc(db, 'cards/tw-abyss'), storedWord)
    })
    const snapshot = await getDocs(
      playerVisibleCardsQuery(firestoreOf(memberContext(testEnv, 'bob'))),
    )
    expect(
      snapshot.docs.map((document) => {
        const { id, kind, isInLibrary } = document.data()
        return { id, kind, isInLibrary }
      }),
    ).toEqual([
      { id: 'cursed-hex', kind: 'cursed', isInLibrary: false },
      { id: 'cursed-oldcurse', kind: 'cursed', isInLibrary: true },
      { id: 'tw-abyss', kind: 'trueWord', isInLibrary: true },
    ])
  })

  it('refuses a player the whole collection', async () => {
    await expect(getDocs(cardsRef(firestoreOf(memberContext(testEnv, 'bob'))))).rejects.toThrow()
  })

  it('gives the DM every card, the drafts included', async () => {
    const snapshot = await getDocs(cardsRef(firestoreOf(memberContext(testEnv, 'dana'))))
    expect(ids(snapshot.docs.map((document) => document.data()))).toEqual([
      'cursed-hex',
      'cursed-newcurse',
      'cursed-oldcurse',
    ])
  })
})
