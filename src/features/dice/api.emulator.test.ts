import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, type Firestore, getDoc, getDocs, setDoc, Timestamp } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import firestoreRules from '../../../firestore.rules?raw'
import { userProfileConverter } from '@/features/users/schema'

import {
  diceRollsRef,
  dmRollsRef,
  recentDmRollsQuery,
  recentRollsQuery,
  rollDice,
  type RollInput,
  setDiceStyle,
  type Thrower,
} from './api'
import { emptyCounts } from './formula'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

/** A user's own Firestore under the real rules. Each call is a separate client, like a separate device. */
const as = (uid: string) => firestoreOf(testEnv.authenticatedContext(uid))

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
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    const profile = (role: string, displayName: string) => ({
      displayName,
      photoURL: null,
      role,
      createdAt: Timestamp.fromMillis(0),
    })
    await setDoc(doc(db, 'users/ayla'), profile('player', 'Ayla'))
    await setDoc(doc(db, 'users/dana'), profile('dm', 'Dana'))
  })
})

/** A thrower with fixed faces and no physics. */
const fixed =
  (...values: number[]): Thrower =>
  () =>
    Promise.resolve({ values, motion: null })

const input = (overrides: Partial<RollInput> = {}): RollInput => ({
  by: 'ayla',
  counts: { ...emptyCounts(), d20: 1, d6: 2 },
  mode: 'normal',
  modifier: 3,
  note: '  Ateş topu  ',
  hidden: false,
  style: 'walnut',
  ...overrides,
})

describe('rolling under the real rules', () => {
  it('writes a roll that every device reads back with its dice and the server time', async () => {
    const { roll, written } = await rollDice(as('ayla'), input(), fixed(17, 4, 2))
    expect(roll).toMatchObject({ by: 'ayla', at: null, hidden: false })
    await written

    const stored = (await getDoc(doc(diceRollsRef(as('dana')), roll.id))).data()
    expect(stored?.at).toBeInstanceOf(Timestamp)
    expect(stored?.content).toEqual({
      style: 'walnut',
      mode: 'normal',
      modifier: 3,
      note: 'Ateş topu',
      dice: [
        { t: 'd20', v: 17 },
        { t: 'd6', v: 4 },
        { t: 'd6', v: 2 },
      ],
      motion: null,
    })
  })

  it('stores the throw and the rests of the real physics, and they read back exactly', async () => {
    const { roll, written } = await rollDice(
      as('ayla'),
      input({ counts: { ...emptyCounts(), d100: 1, d8: 1 } }),
    )
    await written
    const stored = (await getDoc(doc(diceRollsRef(as('ayla')), roll.id))).data()
    expect(stored?.content?.dice.map((die) => die.t)).toEqual(['d8', 'd100', 'd10'])
    expect(stored?.content?.dice).toEqual(roll.content?.dice)
    expect(stored?.content?.motion).toEqual(roll.content?.motion)
    expect(stored?.content?.motion).toHaveLength(3)
  })

  it('throws two d20 for advantage, and rolls normally when the formula is not one d20', async () => {
    const advantage = await rollDice(
      as('ayla'),
      input({ counts: { ...emptyCounts(), d20: 1 }, mode: 'advantage' }),
      fixed(20, 8),
    )
    await advantage.written
    expect(advantage.roll.content?.dice).toHaveLength(2)
    expect(advantage.roll.content?.mode).toBe('advantage')

    const mixed = await rollDice(as('ayla'), input({ mode: 'advantage' }), fixed(5, 1, 1))
    await mixed.written
    expect(mixed.roll.content?.mode).toBe('normal')
  })

  it('writes a hidden roll as its public record and the DM record, which only the DM reads', async () => {
    const { roll, written } = await rollDice(
      as('dana'),
      input({ by: 'dana', hidden: true }),
      fixed(1, 6, 6),
    )
    await written

    const publicRecord = (await getDoc(doc(diceRollsRef(as('ayla')), roll.id))).data()
    expect(publicRecord).toMatchObject({ by: 'dana', hidden: true, content: null })
    const dmRecord = (await getDoc(doc(dmRollsRef(as('dana')), roll.id))).data()
    expect(dmRecord?.content?.dice).toEqual([
      { t: 'd20', v: 1 },
      { t: 'd6', v: 6 },
      { t: 'd6', v: 6 },
    ])
    await expect(getDoc(doc(dmRollsRef(as('ayla')), roll.id))).rejects.toThrow()
  })

  it("refuses a player's hidden roll", async () => {
    const { written } = await rollDice(as('ayla'), input({ hidden: true }), fixed(3, 3, 3))
    await expect(written).rejects.toThrow()
  })

  it('lists the newest rolls first, for every device and for the DM', async () => {
    for (const value of [1, 2, 3]) {
      const { written } = await rollDice(
        as('ayla'),
        input({ counts: { ...emptyCounts(), d4: 1 } }),
        fixed(value),
      )
      await written
    }
    const hidden = await rollDice(as('dana'), input({ by: 'dana', hidden: true }), fixed(9, 1, 1))
    await hidden.written

    const rolls = (await getDocs(recentRollsQuery(as('ayla'), 2))).docs.map((d) => d.data())
    expect(rolls.map((roll) => roll.hidden)).toEqual([true, false])
    expect(rolls[1]?.content?.dice).toEqual([{ t: 'd4', v: 3 }])
    const dmRolls = (await getDocs(recentDmRollsQuery(as('dana'), 50))).docs.map((d) => d.data())
    expect(dmRolls.map((roll) => roll.id)).toEqual([hidden.roll.id])
  })
})

describe('writing other records with a roll', () => {
  it("writes a public roll and the caller's writes in one batch, with the roll's ID and faces", async () => {
    const db = as('ayla')
    let seen: { rollId: string; values: readonly number[] } | null = null
    const { roll, written } = await rollDice(
      db,
      input(),
      fixed(17, 4, 2),
      (batch, rollId, values) => {
        seen = { rollId, values }
        batch.set(doc(db, 'diceRolls', 'ignored'), {})
      },
    )
    expect(seen).toEqual({ rollId: roll.id, values: [17, 4, 2] })
    // The extra write is invalid, so the whole batch is refused: the roll is not written either.
    await expect(written).rejects.toThrow()
    expect((await getDoc(doc(diceRollsRef(as('ayla')), roll.id))).exists()).toBe(false)
  })

  it('writes a public roll together with a valid extra write', async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), 'characters/thorn'), {
        uid: 'ayla',
        name: 'Thorn',
        picture: null,
        archived: false,
        createdAt: Timestamp.fromMillis(1),
        createdBy: 'ayla',
      })
    })
    const db = as('ayla')
    const { roll, written } = await rollDice(db, input(), fixed(17, 4, 2), (batch) => {
      batch.update(doc(db, 'characters/thorn'), { initiativeModifier: 3 })
    })
    await written
    expect(
      (await getDoc(doc(diceRollsRef(as('ayla')), roll.id))).data()?.content?.dice,
    ).toHaveLength(3)
    const character = await getDoc(doc(as('ayla'), 'characters/thorn'))
    expect(character.get('initiativeModifier')).toBe(3)
  })

  it("adds the extra writes to a hidden roll's batch", async () => {
    const db = as('dana')
    const { roll, written } = await rollDice(
      db,
      input({ by: 'dana', hidden: true, counts: { ...emptyCounts(), d20: 2 } }),
      fixed(14, 7),
      (batch, rollId, values) => {
        batch.set(doc(db, 'dmCombatants', 'c1'), {
          combatId: 'combat-1',
          rollId,
          die: values[0],
          modifier: 1,
        })
      },
    )
    await written
    const record = await getDoc(doc(as('dana'), 'dmCombatants/c1'))
    expect(record.data()).toEqual({ combatId: 'combat-1', rollId: roll.id, die: 14, modifier: 1 })
  })
})

describe('the dice style', () => {
  it("saves the user's own style", async () => {
    await setDiceStyle(as('ayla'), 'ayla', 'iron')
    const profile = (
      await getDoc(doc(as('ayla'), 'users/ayla').withConverter(userProfileConverter))
    ).data()
    expect(profile?.diceStyle).toBe('iron')
  })
})
