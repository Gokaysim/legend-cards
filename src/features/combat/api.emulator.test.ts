import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  doc,
  type Firestore,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { memberContext, seedMembers } from '@/test/members'

import firestoreRules from '../../../firestore.rules?raw'
import { rollDice, type Thrower } from '@/features/dice/api'

import {
  addCombatants,
  clearRoll,
  combatantsRef,
  combatChangesRef,
  combatRef,
  delayMyTurn,
  dmCombatantsRef,
  endCombat,
  endMyTurn,
  initiativeRequest,
  initiativeWrites,
  moveCombatant,
  npcGroupRequest,
  npcGroupWrites,
  openCombat,
  removeCombatant,
  startFight,
  stepTurn,
} from './api'
import { CombatOpenError } from './errors'
import { initiativeOrder } from './order'
import type { Combatant } from './schema'

let testEnv: RulesTestEnvironment

function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

/** A user's own Firestore under the real rules. */
const as = (uid: string) => firestoreOf(memberContext(testEnv, uid))

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
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    const profile = (role: string, displayName: string) => ({
      displayName,
      photoURL: null,
      role,
      createdAt: Timestamp.fromMillis(0),
    })
    await setDoc(doc(db, 'users/ayla'), profile('player', 'Ayla'))
    await setDoc(doc(db, 'users/bora'), profile('player', 'Bora'))
    await setDoc(doc(db, 'users/dana'), profile('dm', 'Dana'))
    const character = (uid: string, name: string) => ({
      uid,
      name,
      picture: null,
      archived: false,
      createdAt: Timestamp.fromMillis(1),
      createdBy: uid,
    })
    await setDoc(doc(db, 'characters/thorn'), character('ayla', 'Thorn'))
    await setDoc(doc(db, 'characters/elara'), character('bora', 'Elara'))
  })
})

/** A thrower with fixed faces and no physics. */
const fixed =
  (...values: number[]): Thrower =>
  () =>
    Promise.resolve({ values, motion: null })

async function combatants(db: Firestore = as('dana')): Promise<Combatant[]> {
  return (await getDocs(combatantsRef(db))).docs.map((d) => d.data())
}

async function combatantOf(characterId: string): Promise<Combatant> {
  const found = (await combatants()).find((c) => c.characterId === characterId)
  if (!found) throw new Error(`No combatant for ${characterId}`)
  return found
}

/** Opens a combat with Thorn, Elara and four goblins at +1, and rolls the goblins hidden. */
async function openWithGoblins() {
  const dm = as('dana')
  const opened = await openCombat(dm, {
    by: 'dana',
    characters: [
      { characterId: 'thorn', uid: 'ayla' },
      { characterId: 'elara', uid: 'bora' },
    ],
    npcGroups: [{ name: 'Goblin', count: 4, modifier: 1 }],
  })
  const group = opened.npcGroups[0]
  if (!group) throw new Error('No goblins')
  const { written } = await rollDice(
    dm,
    { ...npcGroupRequest(group), by: 'dana', style: 'galaxy' },
    fixed(14, 7, 20, 2),
    npcGroupWrites(dm, group, opened.combatId),
  )
  await written
  return { ...opened, goblins: group }
}

/** Ayla's or Bora's "At" for their character. */
async function rollFor(uid: string, characterId: string, name: string, die: number, mod: number) {
  const db = as(uid)
  const combatant = await combatantOf(characterId)
  const { written } = await rollDice(
    db,
    { ...initiativeRequest(name, mod), by: uid, style: 'walnut' },
    fixed(die),
    initiativeWrites(db, combatant, mod),
  )
  return written
}

describe('opening and rolling', () => {
  it('opens a combat, rolls the goblins hidden and a player character in the channel', async () => {
    const { combatId, goblins } = await openWithGoblins()
    expect(goblins.names).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3', 'Goblin 4'])

    const combat = (await getDoc(combatRef(as('ayla')))).data()
    expect(combat).toMatchObject({ phase: 'gathering', combatId, order: [] })

    const goblinRolls = (await getDocs(dmCombatantsRef(as('dana')))).docs.map((d) => d.data())
    expect(goblinRolls.map((r) => r.die).sort((a, b) => a - b)).toEqual([2, 7, 14, 20])
    const publicGoblins = (await combatants(as('ayla'))).filter((c) => c.kind === 'npc')
    expect(publicGoblins.every((c) => c.rolled && c.roll === null)).toBe(true)

    await rollFor('ayla', 'thorn', 'Thorn', 17, 3)
    expect((await combatantOf('thorn')).roll).toMatchObject({ die: 17, modifier: 3 })
    const thorn = await getDoc(doc(as('ayla'), 'characters/thorn'))
    expect(thorn.get('initiativeModifier')).toBe(3)
  })

  it('refuses a second combat', async () => {
    await openWithGoblins()
    await expect(
      openCombat(as('dana'), {
        by: 'dana',
        characters: [{ characterId: 'thorn', uid: 'ayla' }],
        npcGroups: [],
      }),
    ).rejects.toBeInstanceOf(CombatOpenError)
  })

  it("refuses rolling another player's character, and the roll is not written", async () => {
    await openWithGoblins()
    await expect(rollFor('bora', 'thorn', 'Thorn', 12, 0)).rejects.toThrow()
    expect((await combatantOf('thorn')).roll).toBeNull()
  })

  it('lets the DM clear a roll, so the player rolls again', async () => {
    await openWithGoblins()
    await rollFor('ayla', 'thorn', 'Thorn', 4, 3)
    await clearRoll(as('dana'), await combatantOf('thorn'))
    expect(await combatantOf('thorn')).toMatchObject({ rolled: false, roll: null })
    await rollFor('ayla', 'thorn', 'Thorn', 15, 3)
    expect((await combatantOf('thorn')).roll?.die).toBe(15)
  })

  it('adds a character and a rolled NPC group while gathering', async () => {
    const { combatId } = await openWithGoblins()
    const dm = as('dana')
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), 'characters/brom'), {
        uid: 'bora',
        name: 'Brom',
        picture: null,
        archived: false,
        createdAt: Timestamp.fromMillis(1),
        createdBy: 'bora',
      })
    })
    const added = await addCombatants(dm, {
      by: 'dana',
      combatId,
      firstSeq: 6,
      characters: [{ characterId: 'brom', uid: 'bora' }],
      npcGroups: [{ name: 'Ogre', count: 1, modifier: 2 }],
    })
    const ogre = added.npcGroups[0]
    if (!ogre) throw new Error('No ogre')
    const { written } = await rollDice(
      dm,
      { ...npcGroupRequest(ogre), by: 'dana', style: 'galaxy' },
      fixed(11),
      npcGroupWrites(dm, ogre, combatId, { dmUid: 'dana', firstSeq: 7 }),
    )
    await written
    const all = await combatants()
    expect(all.find((c) => c.characterId === 'brom')).toMatchObject({ rolled: false, seq: 6 })
    expect(all.find((c) => c.name === 'Ogre')).toMatchObject({ rolled: true, seq: 7 })
  })
})

describe('the fight', () => {
  /** Opens, rolls Thorn 17+3 and leaves Elara without a roll, then starts with the DM's order. */
  async function startedFight() {
    const opened = await openWithGoblins()
    await rollFor('ayla', 'thorn', 'Thorn', 17, 3)
    const all = await combatants()
    const dmRolls = new Map(
      (await getDocs(dmCombatantsRef(as('dana')))).docs.map((d) => [d.id, d.data()]),
    )
    const order = initiativeOrder(
      all.map((c) => {
        const npc = dmRolls.get(c.id)
        return {
          id: c.id,
          seq: c.seq,
          die: c.roll?.die ?? npc?.die ?? null,
          modifier: c.roll?.modifier ?? npc?.modifier ?? null,
        }
      }),
    )
    await startFight(as('dana'), { by: 'dana', combatId: opened.combatId, order })
    return { ...opened, order, all }
  }

  /** The turn a user saw: the place, the round and the combatant active there. */
  const at = (order: readonly string[], turn: number, round: number) => ({
    turn,
    round,
    activeId: order[turn] ?? null,
  })

  const nameOf = (all: readonly Combatant[], id: string | undefined) => {
    const c = all.find((x) => x.id === id)
    return c?.name ?? c?.characterId ?? null
  }

  it('starts in the initiative order with someone who did not roll last, and records the start', async () => {
    const { order, all } = await startedFight()
    // Goblin 3 rolled a natural 20; Thorn 20; Goblin 1 15; Goblin 2 8; Goblin 4 a natural 1; Elara did not roll.
    expect(order.map((id) => nameOf(all, id))).toEqual([
      'Goblin 3',
      'thorn',
      'Goblin 1',
      'Goblin 2',
      'Goblin 4',
      'elara',
    ])
    const combat = (await getDoc(combatRef(as('ayla')))).data()
    expect(combat).toMatchObject({ phase: 'running', turn: 0, round: 1, order })
    const changes = (await getDocs(combatChangesRef(as('ayla')))).docs.map((d) => d.data())
    expect(changes).toMatchObject([{ by: 'dana', step: 'start', count: 6 }])
  })

  it('refuses a roll after the start', async () => {
    await startedFight()
    await expect(rollFor('bora', 'elara', 'Elara', 9, 1)).rejects.toThrow()
  })

  it('steps turns as the DM, and a double press steps once', async () => {
    const { order } = await startedFight()
    const dm = as('dana')
    await Promise.all([
      stepTurn(dm, 'next', at(order, 0, 1)),
      stepTurn(as('dana'), 'next', at(order, 0, 1)),
    ])
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({ turn: 1, round: 1 })
    await stepTurn(dm, 'back', at(order, 1, 1))
    await stepTurn(dm, 'back', at(order, 0, 1))
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({ turn: 0, round: 1 })
  })

  it("lets the active character's owner end their turn, and drops a press that is not theirs", async () => {
    const { order } = await startedFight()
    const dm = as('dana')
    await stepTurn(dm, 'next', at(order, 0, 1))
    await endMyTurn(as('bora'), 'bora', at(order, 1, 1))
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({ turn: 1 })
    await endMyTurn(as('ayla'), 'ayla', at(order, 1, 1))
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({ turn: 2, round: 1 })
  })

  it("keeps one step when a player's turn end races the DM's step", async () => {
    const { order } = await startedFight()
    const dm = as('dana')
    await stepTurn(dm, 'next', at(order, 0, 1))
    await Promise.all([
      endMyTurn(as('ayla'), 'ayla', at(order, 1, 1)),
      stepTurn(dm, 'next', at(order, 1, 1)),
    ])
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({ turn: 2, round: 1 })
  })

  /** Changes stored documents, bypassing the rules. */
  async function asAdmin(changes: Record<string, Record<string, unknown>>) {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      for (const [path, data] of Object.entries(changes)) {
        await updateDoc(doc(firestoreOf(admin), path), data)
      }
    })
  }

  const ids = (order: readonly string[], places: readonly number[]) =>
    places.map((place) => order[place] ?? '')

  it("lets the active character's owner delay behind the next one, and drops a delay that is not theirs", async () => {
    const { order } = await startedFight()
    const dm = as('dana')
    await stepTurn(dm, 'next', at(order, 0, 1))
    await delayMyTurn(as('bora'), 'bora', at(order, 1, 1))
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({ order, turn: 1 })
    await delayMyTurn(as('ayla'), 'ayla', at(order, 1, 1))
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({
      order: ids(order, [0, 2, 1, 3, 4, 5]),
      turn: 1,
      round: 1,
    })
  })

  it('delays the last combatant behind the first one, into the next round', async () => {
    const { order } = await startedFight()
    await asAdmin({ 'combat/main': { turn: 5 } })
    await delayMyTurn(as('bora'), 'bora', at(order, 5, 1))
    expect((await getDoc(combatRef(as('dana')))).data()).toMatchObject({
      order: ids(order, [0, 5, 1, 2, 3, 4]),
      turn: 0,
      round: 2,
    })
  })

  it('delays once when a player who owns the next combatant too presses twice', async () => {
    const { order, all } = await startedFight()
    const elara = all.find((c) => c.characterId === 'elara')?.id ?? ''
    const together = ids(order, [0, 1, 5, 2, 3, 4])
    expect(together[2]).toBe(elara)
    await asAdmin({
      'combat/main': { order: together, turn: 1 },
      [`combatants/${elara}`]: { uid: 'ayla' },
    })
    await Promise.all([
      delayMyTurn(as('ayla'), 'ayla', at(together, 1, 1)),
      delayMyTurn(as('ayla'), 'ayla', at(together, 1, 1)),
    ])
    expect((await getDoc(combatRef(as('dana')))).data()).toMatchObject({
      order: ids(together, [0, 2, 1, 3, 4, 5]),
      turn: 1,
      round: 1,
    })
  })

  it("keeps one step when a player's delay races the DM's step", async () => {
    const { order } = await startedFight()
    const dm = as('dana')
    await stepTurn(dm, 'next', at(order, 0, 1))
    await Promise.all([
      delayMyTurn(as('ayla'), 'ayla', at(order, 1, 1)),
      stepTurn(dm, 'next', at(order, 1, 1)),
    ])
    const combat = (await getDoc(combatRef(dm))).data()
    expect(combat?.round).toBe(1)
    expect(combat?.order[combat.turn]).toBe(order[2])
  })

  it("drops the DM's step from a turn whose active combatant was removed", async () => {
    const { order } = await startedFight()
    const dm = as('dana')
    await stepTurn(dm, 'next', at(order, 0, 1))
    await removeCombatant(dm, order[1] ?? '')
    await stepTurn(dm, 'next', at(order, 1, 1))
    const combat = (await getDoc(combatRef(dm))).data()
    expect(combat).toMatchObject({ turn: 1, round: 1 })
    expect(combat?.order[combat.turn]).toBe(order[2])
  })

  it('reorders with the active combatant kept active', async () => {
    const { order } = await startedFight()
    const dm = as('dana')
    await stepTurn(dm, 'next', at(order, 0, 1))
    const thorn = order[1] ?? ''
    await moveCombatant(dm, thorn, 3)
    const combat = (await getDoc(combatRef(dm))).data()
    expect(combat?.order[3]).toBe(thorn)
    expect(combat?.turn).toBe(3)
  })

  it('removes the active combatant and makes the next one active', async () => {
    const { order } = await startedFight()
    const dm = as('dana')
    await stepTurn(dm, 'next', at(order, 0, 1))
    await removeCombatant(dm, order[1] ?? '')
    const combat = (await getDoc(combatRef(dm))).data()
    expect(combat?.order).toEqual(order.filter((id) => id !== order[1]))
    expect(combat?.order[combat.turn]).toBe(order[2])
    expect((await getDoc(doc(combatantsRef(dm), order[1] ?? 'x'))).exists()).toBe(false)
  })

  it('adds combatants by hand during the fight, last', async () => {
    const { combatId, order } = await startedFight()
    await addCombatants(as('dana'), {
      by: 'dana',
      combatId,
      firstSeq: 10,
      characters: [],
      npcGroups: [{ name: 'Kurt', count: 2, modifier: 0 }],
    })
    const combat = (await getDoc(combatRef(as('dana')))).data()
    expect(combat?.order).toHaveLength(order.length + 2)
    const wolves = (await combatants()).filter((c) => c.name?.startsWith('Kurt'))
    expect(wolves.map((w) => w.name).sort()).toEqual(['Kurt 1', 'Kurt 2'])
    expect(wolves.every((w) => w.manual && !w.rolled)).toBe(true)
  })

  it('ends the fight: empty collections, idle, and an end record with the round', async () => {
    const { all, order } = await startedFight()
    const dm = as('dana')
    await stepTurn(dm, 'back', at(order, 0, 1))
    for (let i = 0; i < 6; i++) {
      const c = (await getDoc(combatRef(dm))).data()
      await stepTurn(dm, 'next', at(c?.order ?? [], c?.turn ?? 0, c?.round ?? 1))
    }
    await endCombat(dm, { by: 'dana', combatantIds: all.map((c) => c.id) })
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({ phase: 'idle', combatId: null })
    expect(await combatants()).toEqual([])
    expect((await getDocs(dmCombatantsRef(dm))).empty).toBe(true)
    const changes = (await getDocs(combatChangesRef(dm))).docs.map((d) => d.data())
    expect(changes.find((c) => c.step === 'end')).toMatchObject({ count: 2 })
  })

  it('gives up a combat before the fight without a record', async () => {
    await openWithGoblins()
    const dm = as('dana')
    await endCombat(dm, { by: 'dana', combatantIds: (await combatants()).map((c) => c.id) })
    expect((await getDoc(combatRef(dm))).data()).toMatchObject({ phase: 'idle' })
    expect((await getDocs(combatChangesRef(dm))).empty).toBe(true)
  })
})
