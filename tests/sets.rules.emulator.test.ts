import { readFileSync } from 'node:fs'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  deleteDoc,
  doc,
  type Firestore,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { memberContext, seedMembers } from '../src/test/members.ts'

// The rules of the card sets and their change records (firestore.rules: sets/{setId}, setChanges/{changeId}; spec:
// card-sets, data-access-control).

const PROJECT_ID = 'demo-legend-cards'

let testEnv: RulesTestEnvironment

function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

const asUser = (uid: string) => firestoreOf(memberContext(testEnv, uid))
const signedOut = () => firestoreOf(testEnv.unauthenticatedContext())

/** A stored set as the import or the app writes it. */
function storedSet(overrides: Record<string, unknown> = {}) {
  return {
    code: 'Kesqer',
    name: 'Kesqerian Nights',
    aliases: [],
    position: 5,
    packLayout: 'standard',
    changeId: 'c0',
    ...overrides,
  }
}

/** A set change record as the app writes it. */
function record(step: string, setId: string, overrides: Record<string, unknown> = {}) {
  return {
    by: 'dana',
    at: serverTimestamp(),
    step,
    setId,
    code: 'Kesqer',
    name: 'Kesqerian Nights',
    fields: [],
    direction: null,
    added: [],
    pictured: [],
    ...overrides,
  }
}

async function readAsAdmin(path: string): Promise<unknown> {
  let data: unknown
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    data = (await getDoc(doc(firestoreOf(admin), path))).data()
  })
  return data
}

async function setTable(openPackId: string | null) {
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(firestoreOf(admin), 'table/main'), { openPackId })
  })
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
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
    const profile = (displayName: string, role: 'dm' | 'player') => ({
      displayName,
      photoURL: null,
      role,
      createdAt: Timestamp.fromMillis(0),
    })
    await setDoc(doc(db, 'users/dana'), profile('Dana', 'dm'))
    await setDoc(doc(db, 'users/ayla'), profile('Ayla', 'player'))
    await setDoc(doc(db, 'table/main'), { openPackId: null })
    await setDoc(doc(db, 'sets/kesqer'), storedSet())
    await setDoc(
      doc(db, 'sets/ulagal'),
      storedSet({ code: 'Ulagal', name: 'Ballad of Ulagal', position: 9, changeId: 'c1' }),
    )
    await setDoc(doc(db, 'setChanges/c0'), {
      ...record('imported', 'kesqer'),
      at: Timestamp.fromMillis(0),
    })
  })
})

/** Writes a set step and its record in one batch, as the DM (or `uid`). */
function step(
  uid: string,
  write: (batch: ReturnType<typeof writeBatch>, db: Firestore) => void,
): Promise<void> {
  const db = asUser(uid)
  const batch = writeBatch(db)
  write(batch, db)
  return batch.commit()
}

describe('reading sets and their records', () => {
  it('lets every signed-in user read the sets and the records', async () => {
    await assertSucceeds(getDocs(collection(asUser('ayla'), 'sets')))
    await assertSucceeds(getDoc(doc(asUser('ayla'), 'setChanges/c0')))
  })

  it('denies signed-out reads', async () => {
    await assertFails(getDoc(doc(signedOut(), 'sets/kesqer')))
    await assertFails(getDoc(doc(signedOut(), 'setChanges/c0')))
  })
})

describe('adding a set', () => {
  const zaddir = (overrides: Record<string, unknown> = {}) =>
    storedSet({
      code: 'Zaddir',
      name: 'Tower of Zaddir',
      position: 13,
      changeId: 'r1',
      ...overrides,
    })
  const added = (overrides: Record<string, unknown> = {}) =>
    record('added', 'zaddir', { code: 'Zaddir', name: 'Tower of Zaddir', ...overrides })

  it('lets the DM add a set with its record', async () => {
    await assertSucceeds(
      step('dana', (batch, db) => {
        batch.set(doc(db, 'sets/zaddir'), { ...zaddir(), cardback: null, mascot: null })
        batch.set(doc(db, 'setChanges/r1'), added())
      }),
    )
  })

  it('denies a set without its record, and a record without its set', async () => {
    await assertFails(setDoc(doc(asUser('dana'), 'sets/zaddir'), zaddir()))
    await assertFails(setDoc(doc(asUser('dana'), 'setChanges/r1'), added()))
  })

  it('denies a player', async () => {
    await assertFails(
      step('ayla', (batch, db) => {
        batch.set(doc(db, 'sets/zaddir'), zaddir())
        batch.set(doc(db, 'setChanges/r1'), added({ by: 'ayla' }))
      }),
    )
  })

  it.each([
    ['an ID that is not normalized', 'Zaddir', {}],
    ['an empty name', 'zaddir', { name: '' }],
    ['a name over 100 characters', 'zaddir', { name: 'x'.repeat(101) }],
    ['11 aliases', 'zaddir', { aliases: Array.from({ length: 11 }, (_, i) => `a${i}`) }],
    ['an unknown layout', 'zaddir', { packLayout: 'mechanic' }],
    ['a position that is not an integer', 'zaddir', { position: 1.5 }],
    ['an extra field', 'zaddir', { extra: true }],
    ["another set's picture", 'zaddir', { cardback: 'sets/kesqer/0123456789.webp' }],
  ])('denies %s', async (_label, setId, overrides) => {
    await assertFails(
      step('dana', (batch, db) => {
        batch.set(doc(db, `sets/${setId}`), zaddir(overrides))
        batch.set(doc(db, 'setChanges/r1'), added({ setId }))
      }),
    )
  })

  it("accepts the set's own picture path", async () => {
    await assertSucceeds(
      step('dana', (batch, db) => {
        batch.set(doc(db, 'sets/zaddir'), zaddir({ cardback: 'sets/zaddir/0123456789.webp' }))
        batch.set(doc(db, 'setChanges/r1'), added())
      }),
    )
  })

  it('denies a record that another user signs or that has the wrong step', async () => {
    await assertFails(
      step('dana', (batch, db) => {
        batch.set(doc(db, 'sets/zaddir'), zaddir())
        batch.set(doc(db, 'setChanges/r1'), added({ by: 'ayla' }))
      }),
    )
    await assertFails(
      step('dana', (batch, db) => {
        batch.set(doc(db, 'sets/zaddir'), zaddir())
        batch.set(doc(db, 'setChanges/r1'), added({ step: 'edited' }))
      }),
    )
  })
})

describe('editing a set', () => {
  const edited = (overrides: Record<string, unknown> = {}) =>
    record('edited', 'kesqer', { fields: ['name'], ...overrides })

  it('lets the DM rename a set with its record', async () => {
    await assertSucceeds(
      step('dana', (batch, db) => {
        batch.update(doc(db, 'sets/kesqer'), { name: 'Nights of Kesqer', changeId: 'r2' })
        batch.set(doc(db, 'setChanges/r2'), edited())
      }),
    )
    expect(await readAsAdmin('sets/kesqer')).toMatchObject({ name: 'Nights of Kesqer' })
  })

  it('denies a change without a new record', async () => {
    await assertFails(updateDoc(doc(asUser('dana'), 'sets/kesqer'), { name: 'Nights of Kesqer' }))
  })

  it('denies a new code', async () => {
    await assertFails(
      step('dana', (batch, db) => {
        batch.update(doc(db, 'sets/kesqer'), { code: 'Kesq', changeId: 'r2' })
        batch.set(doc(db, 'setChanges/r2'), edited({ fields: [] }))
      }),
    )
  })

  it('denies an edit that moves the set', async () => {
    await assertFails(
      step('dana', (batch, db) => {
        batch.update(doc(db, 'sets/kesqer'), { position: 1, changeId: 'r2' })
        batch.set(doc(db, 'setChanges/r2'), edited({ fields: [] }))
      }),
    )
  })

  it('denies a player', async () => {
    await assertFails(
      step('ayla', (batch, db) => {
        batch.update(doc(db, 'sets/kesqer'), { name: 'Nights of Kesqer', changeId: 'r2' })
        batch.set(doc(db, 'setChanges/r2'), edited({ by: 'ayla' }))
      }),
    )
  })

  it('denies a layout change while a pack is open, and allows a rename', async () => {
    await setTable('p-open')
    await assertFails(
      step('dana', (batch, db) => {
        batch.update(doc(db, 'sets/kesqer'), { packLayout: 'pandemonium', changeId: 'r2' })
        batch.set(doc(db, 'setChanges/r2'), edited({ fields: ['packLayout'] }))
      }),
    )
    await assertSucceeds(
      step('dana', (batch, db) => {
        batch.update(doc(db, 'sets/kesqer'), { name: 'Nights of Kesqer', changeId: 'r3' })
        batch.set(doc(db, 'setChanges/r3'), edited())
      }),
    )
  })

  it('allows a layout change while no pack is open', async () => {
    await assertSucceeds(
      step('dana', (batch, db) => {
        batch.update(doc(db, 'sets/kesqer'), { packLayout: 'pandemonium', changeId: 'r2' })
        batch.set(doc(db, 'setChanges/r2'), edited({ fields: ['packLayout'] }))
      }),
    )
  })
})

describe('moving a set', () => {
  const moved = (overrides: Record<string, unknown> = {}) =>
    record('moved', 'ulagal', {
      code: 'Ulagal',
      name: 'Ballad of Ulagal',
      direction: 'up',
      ...overrides,
    })

  it('lets the DM swap two sets with one record', async () => {
    await assertSucceeds(
      step('dana', (batch, db) => {
        batch.update(doc(db, 'sets/ulagal'), { position: 5, changeId: 'r4' })
        batch.update(doc(db, 'sets/kesqer'), { position: 9, changeId: 'r4' })
        batch.set(doc(db, 'setChanges/r4'), moved())
      }),
    )
  })

  it('denies a move that changes anything else', async () => {
    await assertFails(
      step('dana', (batch, db) => {
        batch.update(doc(db, 'sets/ulagal'), { position: 5, name: 'Ulagal', changeId: 'r4' })
        batch.set(doc(db, 'setChanges/r4'), moved())
      }),
    )
  })

  it('denies a move record without a direction', async () => {
    await assertFails(
      step('dana', (batch, db) => {
        batch.update(doc(db, 'sets/ulagal'), { position: 5, changeId: 'r4' })
        batch.set(doc(db, 'setChanges/r4'), moved({ direction: null }))
      }),
    )
  })
})

describe('deleting a set', () => {
  const deletion = () => doc(asUser('dana'), 'setChanges/del-ulagal-c1')

  it('lets the DM delete a set with its record', async () => {
    await assertSucceeds(
      step('dana', (batch, db) => {
        batch.delete(doc(db, 'sets/ulagal'))
        batch.set(
          doc(db, 'setChanges/del-ulagal-c1'),
          record('deleted', 'ulagal', { code: 'Ulagal', name: 'Ballad of Ulagal' }),
        )
      }),
    )
    expect(await readAsAdmin('sets/ulagal')).toBeUndefined()
  })

  it('denies a delete without its record, or with a record of another ID', async () => {
    await assertFails(deleteDoc(doc(asUser('dana'), 'sets/ulagal')))
    await assertFails(
      step('dana', (batch, db) => {
        batch.delete(doc(db, 'sets/ulagal'))
        batch.set(doc(db, 'setChanges/del-ulagal-other'), record('deleted', 'ulagal'))
      }),
    )
  })

  it('denies a delete while a pack is open', async () => {
    await setTable('p-open')
    await assertFails(
      step('dana', (batch, db) => {
        batch.delete(doc(db, 'sets/ulagal'))
        batch.set(doc(db, 'setChanges/del-ulagal-c1'), record('deleted', 'ulagal'))
      }),
    )
  })

  it('denies a player', async () => {
    await assertFails(
      step('ayla', (batch, db) => {
        batch.delete(doc(db, 'sets/ulagal'))
        batch.set(doc(db, 'setChanges/del-ulagal-c1'), record('deleted', 'ulagal', { by: 'ayla' }))
      }),
    )
  })

  it('denies a delete record while the set stays', async () => {
    await assertFails(setDoc(deletion(), record('deleted', 'ulagal')))
  })
})

describe('the records never change', () => {
  it('denies updating or deleting a record, also to the DM', async () => {
    await assertFails(updateDoc(doc(asUser('dana'), 'setChanges/c0'), { name: 'x' }))
    await assertFails(deleteDoc(doc(asUser('dana'), 'setChanges/c0')))
  })

  it('denies an import record from the app', async () => {
    await assertFails(
      setDoc(doc(asUser('dana'), 'setChanges/r9'), record('imported', 'kesqer', { setId: null })),
    )
  })
})
