import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, type Firestore, getDocs, type Query, setDoc, Timestamp } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import firestoreRules from '../../../firestore.rules?raw'
import { logQueries } from './api'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

const at = (millis: number) => Timestamp.fromMillis(millis)

/** A holding as stored, given to `uid` at `givenAt` and optionally closed at `returnedAt`. */
function storedHolding(uid: string, givenAt: number, returnedAt: number | null = null) {
  return {
    cardId: 'cursed-visionsofdeath',
    cardName: 'Visions of Death',
    cardKind: 'cursed',
    uid,
    givenAt: at(givenAt),
    givenBy: 'dana',
    givenVia: 'dm',
    transferredFrom: null,
    active: false,
    note: '',
    costOverride: null,
    returnedAt: returnedAt === null ? null : at(returnedAt),
    returnedBy: returnedAt === null ? null : uid,
    returnReason: returnedAt === null ? null : 'used',
    usedOn: null,
    transferredTo: null,
  }
}

/** A free draw by the DM into `uid`'s hand at `millis`. */
function storedDraw(uid: string, millis: number) {
  return {
    kind: 'cursed',
    uid,
    by: 'dana',
    at: at(millis),
    cardId: 'cursed-visionsofdeath',
    cardName: 'Visions of Death',
    cardKind: 'cursed',
    holdingId: `h-${uid}-${millis}`,
    filters: null,
    paidWith: 'none',
    cost: 0,
    entryId: null,
  }
}

function storedEntry(account: string, millis: number) {
  const party = account === 'party'
  return {
    currency: party ? 'gp' : 'lp',
    account,
    delta: 1,
    balanceAfter: 1,
    source: 'manual',
    reason: 'Test',
    by: 'dana',
    at: at(millis),
  }
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
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    await setDoc(doc(db, 'userCards/a-open'), storedHolding('ayla', 1000))
    await setDoc(doc(db, 'userCards/a-used'), storedHolding('ayla', 2000, 6000))
    await setDoc(doc(db, 'userCards/b-open'), storedHolding('bora', 3000))
    await setDoc(doc(db, 'userCards/b-used'), storedHolding('bora', 4000, 5000))
    await setDoc(doc(db, 'ledger/lp-ayla'), storedEntry('ayla', 7000))
    await setDoc(doc(db, 'ledger/lp-bora'), storedEntry('bora', 8000))
    await setDoc(doc(db, 'ledger/gp'), storedEntry('party', 9000))
    await setDoc(doc(db, 'draws/d-ayla'), storedDraw('ayla', 10000))
    await setDoc(doc(db, 'draws/d-bora'), storedDraw('bora', 11000))
    await setDoc(doc(db, 'draws/d-ayla-2'), storedDraw('ayla', 12000))
  })
})

/** Runs the four card and balance queries as a signed-in player and returns the document IDs of each, in order. */
async function ids(uid: string | null, n: number) {
  const db = firestoreOf(testEnv.authenticatedContext('ayla'))
  const queries = logQueries(db, uid, n, false)
  const idsOf = async <T>(query: Query<T>) =>
    (await getDocs(query)).docs.map((document) => document.id)
  return {
    given: await idsOf(queries.given),
    closed: await idsOf(queries.closed),
    draws: await idsOf(queries.draws),
    entries: await idsOf(queries.entries),
  }
}

describe('the log queries', () => {
  it('return every record, newest first', async () => {
    expect(await ids(null, 50)).toEqual({
      given: ['b-used', 'b-open', 'a-used', 'a-open'],
      closed: ['a-used', 'b-used'],
      draws: ['d-ayla-2', 'd-bora', 'd-ayla'],
      entries: ['gp', 'lp-bora', 'lp-ayla'],
    })
  })

  it('stop at n', async () => {
    expect(await ids(null, 1)).toEqual({
      given: ['b-used'],
      closed: ['a-used'],
      draws: ['d-ayla-2'],
      entries: ['gp'],
    })
  })

  it("keep only one user's records, and never the party's", async () => {
    expect(await ids('ayla', 50)).toEqual({
      given: ['a-used', 'a-open'],
      closed: ['a-used'],
      draws: ['d-ayla-2', 'd-ayla'],
      entries: ['lp-ayla'],
    })
  })
})

describe('the log queries and the parts of draws and packs', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await setDoc(doc(db, 'userCards/a-drawn'), {
        ...storedHolding('ayla', 13000),
        givenVia: 'draw',
        drawId: 'd-ayla-2',
      })
      await setDoc(doc(db, 'userCards/a-pack'), {
        ...storedHolding('ayla', 14000),
        givenVia: 'pack',
        drawId: 'p-ayla',
      })
      await setDoc(doc(db, 'ledger/draw-paid'), {
        ...storedEntry('ayla', 13000),
        delta: -1,
        source: 'draw',
        reason: null,
        drawId: 'd-ayla-2',
      })
      await setDoc(doc(db, 'ledger/pack-paid'), {
        ...storedEntry('party', 14000),
        delta: -5000,
        balanceAfter: 0,
        source: 'pack',
        reason: null,
        drawId: 'p-ayla',
      })
      await setDoc(doc(db, 'draws/p-ayla'), {
        kind: 'pack',
        uid: 'ayla',
        by: 'dana',
        at: at(13500),
        packType: 'golden',
        setCode: null,
        mechanicPack: null,
        offered: ['a', 'b', 'c', 'd', 'e'],
        revealed: [0, 1, 2, 3, 4],
        paidWith: 'gp',
        cost: 5000,
        entryId: 'pack-paid',
        status: 'chosen',
        closedAt: at(14000),
        closedBy: 'dana',
        chosen: { cardId: 'a', cardName: 'A', cardKind: 'normal', holdingId: 'a-pack' },
        cursed: null,
        refundEntryId: null,
      })
    })
  })

  it('leave out the holdings and entries of draws and packs, and return the packs among the draws', async () => {
    expect(await ids(null, 50)).toEqual({
      given: ['b-used', 'b-open', 'a-used', 'a-open'],
      closed: ['a-used', 'b-used'],
      draws: ['p-ayla', 'd-ayla-2', 'd-bora', 'd-ayla'],
      entries: ['gp', 'lp-bora', 'lp-ayla'],
    })
  })

  it("leave them out of one user's records too", async () => {
    expect(await ids('ayla', 50)).toEqual({
      given: ['a-used', 'a-open'],
      closed: ['a-used'],
      draws: ['p-ayla', 'd-ayla-2', 'd-ayla'],
      entries: ['lp-ayla'],
    })
  })
})

describe('the log queries of True Words', () => {
  /** A word's holding as stored: taught by the DM unless `draftId` names its draft, and maybe taken back. */
  function storedWordHolding(
    uid: string,
    givenAt: number,
    {
      draftId = null,
      takenBackAt = null,
    }: { draftId?: string | null; takenBackAt?: number | null } = {},
  ) {
    return {
      ...storedHolding(uid, givenAt),
      cardId: 'tw-abyss',
      cardName: 'Abyss',
      cardKind: 'trueWord',
      givenBy: draftId === null ? 'dana' : uid,
      givenVia: draftId === null ? 'dm' : 'draft',
      drawId: draftId,
      returnedAt: takenBackAt === null ? null : at(takenBackAt),
      returnedBy: takenBackAt === null ? null : 'dana',
      returnReason: takenBackAt === null ? null : 'discarded',
    }
  }

  /** A paid draft for `uid` that ended with a learned word, among the draws. */
  function storedDraft(uid: string, millis: number) {
    return {
      kind: 'wordDraft',
      uid,
      by: uid,
      at: at(millis),
      offered: ['tw-abyss', 'tw-aid', 'tw-dragon'],
      status: 'learned',
      paidWith: 'lp',
      cost: 1,
      entryId: `pay-${uid}`,
      closedAt: at(millis + 100),
      closedBy: uid,
      learned: { cardId: 'tw-abyss', cardName: 'Abyss', holdingId: `r-${uid}-draft` },
      refundEntryId: null,
    }
  }

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await setDoc(doc(db, 'draws/w-ayla'), storedDraft('ayla', 20000))
      await setDoc(doc(db, 'draws/w-bora'), storedDraft('bora', 21000))
      // Learned from the drafts: part of their events.
      await setDoc(
        doc(db, 'userCards/r-ayla-draft'),
        storedWordHolding('ayla', 20100, { draftId: 'w-ayla' }),
      )
      await setDoc(
        doc(db, 'userCards/r-bora-draft'),
        storedWordHolding('bora', 21100, { draftId: 'w-bora' }),
      )
      // Taught by the DM; Ayla's later taken back.
      await setDoc(
        doc(db, 'userCards/r-ayla-taught'),
        storedWordHolding('ayla', 22000, { takenBackAt: 24000 }),
      )
      await setDoc(doc(db, 'userCards/r-bora-taught'), storedWordHolding('bora', 23000))
      // A draft's payment: not a change by hand.
      await setDoc(doc(db, 'ledger/pay-ayla'), {
        ...storedEntry('ayla', 20000),
        delta: -1,
        source: 'wordDraft',
        reason: null,
        drawId: 'w-ayla',
      })
    })
  })

  it('return the drafts among the draws, and the taught and taken-back words among the holdings, without the words learned in drafts or their payments', async () => {
    expect(await ids(null, 50)).toEqual({
      given: ['r-bora-taught', 'r-ayla-taught', 'b-used', 'b-open', 'a-used', 'a-open'],
      closed: ['r-ayla-taught', 'a-used', 'b-used'],
      draws: ['w-bora', 'w-ayla', 'd-ayla-2', 'd-bora', 'd-ayla'],
      entries: ['gp', 'lp-bora', 'lp-ayla'],
    })
  })

  it("keep only one user's", async () => {
    expect(await ids('ayla', 50)).toEqual({
      given: ['r-ayla-taught', 'a-used', 'a-open'],
      closed: ['r-ayla-taught', 'a-used'],
      draws: ['w-ayla', 'd-ayla-2', 'd-ayla'],
      entries: ['lp-ayla'],
    })
  })

  it('stop at n', async () => {
    expect(await ids(null, 1)).toMatchObject({ given: ['r-bora-taught'], draws: ['w-bora'] })
  })
})

describe('the log queries of uses and their payments', () => {
  /** A use of a card or word kept on use, by `uid` at `millis`, paid with `pay-<id>`. */
  function storedUse(uid: string, millis: number, kind: 'trueWord' | 'normal') {
    const word = kind === 'trueWord'
    return {
      uid,
      cardId: word ? 'tw-abyss' : 'legend-abolethseyes',
      cardName: word ? 'Abyss' : "Aboleth's Eyes",
      cardKind: kind,
      holdingId: `r-${uid}`,
      by: uid,
      at: at(millis),
      cost: 2,
      entryId: `pay-u-${uid}`,
    }
  }

  /** A use payment as stored: `source` of a closing use or a kept use, for the record `drawId`. */
  function storedPayment(
    account: string,
    millis: number,
    source: 'use' | 'keptUse',
    drawId: string,
  ) {
    return { ...storedEntry(account, millis), delta: -2, source, reason: null, drawId }
  }

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await setDoc(doc(db, 'uses/u-ayla'), storedUse('ayla', 30000, 'trueWord'))
      await setDoc(doc(db, 'uses/u-bora'), storedUse('bora', 31000, 'normal'))
      await setDoc(doc(db, 'ledger/pay-u-ayla'), storedPayment('ayla', 30000, 'keptUse', 'u-ayla'))
      await setDoc(doc(db, 'ledger/pay-a-used'), storedPayment('ayla', 6000, 'use', 'a-used'))
    })
  })

  async function useIds(uid: string | null, n: number) {
    const db = firestoreOf(testEnv.authenticatedContext('ayla'))
    const queries = logQueries(db, uid, n, false)
    const idsOf = async <T>(query: Query<T>) =>
      (await getDocs(query)).docs.map((document) => document.id)
    return {
      uses: await idsOf(queries.uses),
      closed: await idsOf(queries.closed),
      entries: await idsOf(queries.entries),
    }
  }

  it('return the kept uses of words and cards, newest first, and never a use payment as a change by hand', async () => {
    expect(await useIds(null, 50)).toEqual({
      uses: ['u-bora', 'u-ayla'],
      closed: ['a-used', 'b-used'],
      entries: ['gp', 'lp-bora', 'lp-ayla'],
    })
  })

  it("keep only one user's uses, and stop at n", async () => {
    expect(await useIds('ayla', 50)).toEqual({
      uses: ['u-ayla'],
      closed: ['a-used'],
      entries: ['lp-ayla'],
    })
    expect((await useIds(null, 1)).uses).toEqual(['u-bora'])
  })
})

describe('the definition changes query', () => {
  const record = (step: string, isPublic: boolean, millis: number) => ({
    target: 'card',
    targetId: 'legend-bardsencore',
    name: "Bard's Encore",
    step,
    before: null,
    after: null,
    public: isPublic,
    by: 'dana',
    at: at(millis),
  })

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      const profile = (role: string) => ({
        displayName: role,
        photoURL: null,
        role,
        createdAt: Timestamp.fromMillis(0),
      })
      await setDoc(doc(db, 'users/ayla'), profile('player'))
      await setDoc(doc(db, 'users/dana'), profile('dm'))
      await setDoc(doc(db, 'definitionChanges/c-added'), record('added', false, 1000))
      await setDoc(doc(db, 'definitionChanges/c-edited'), record('edited', false, 2000))
      await setDoc(doc(db, 'definitionChanges/c-published'), record('published', true, 3000))
    })
  })

  const changeIds = async (viewer: string, isDm: boolean, uid: string | null = null) => {
    const queries = logQueries(firestoreOf(testEnv.authenticatedContext(viewer)), uid, 50, isDm)
    return queries.changes === null
      ? null
      : (await getDocs(queries.changes)).docs.map((document) => document.id)
  }

  it('gives a player only the public changes, newest first, and the DM all of them', async () => {
    expect(await changeIds('ayla', false)).toEqual(['c-published'])
    expect(await changeIds('dana', true)).toEqual(['c-published', 'c-edited', 'c-added'])
  })

  it('leaves the changes out with a user filter', async () => {
    expect(await changeIds('dana', true, 'ayla')).toBeNull()
  })
})

describe('the table changes query', () => {
  const change = (after: string, millis: number) => ({
    by: 'dana',
    at: at(millis),
    setting: 'playerDraw',
    before: 'off',
    after,
  })

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await setDoc(doc(db, 'tableChanges/tc-1'), change('filtered', 1000))
      await setDoc(doc(db, 'tableChanges/tc-2'), change('pick', 2000))
    })
  })

  const tableChangeIds = async (viewer: string, uid: string | null = null) => {
    const queries = logQueries(firestoreOf(testEnv.authenticatedContext(viewer)), uid, 50, false)
    return queries.tableChanges === null
      ? null
      : (await getDocs(queries.tableChanges)).docs.map((document) => document.id)
  }

  it('gives a player every change, newest first', async () => {
    expect(await tableChangeIds('ayla')).toEqual(['tc-2', 'tc-1'])
  })

  it('leaves the changes out with a user filter', async () => {
    expect(await tableChangeIds('ayla', 'ayla')).toBeNull()
  })
})

describe('the fight records query', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await setDoc(doc(db, 'combatChanges/f-1'), {
        by: 'dana',
        at: at(1000),
        step: 'start',
        count: 6,
      })
      await setDoc(doc(db, 'combatChanges/f-2'), {
        by: 'dana',
        at: at(2000),
        step: 'end',
        count: 5,
      })
    })
  })

  const fightIds = async (viewer: string, uid: string | null = null) => {
    const queries = logQueries(firestoreOf(testEnv.authenticatedContext(viewer)), uid, 50, false)
    return queries.combatChanges === null
      ? null
      : (await getDocs(queries.combatChanges)).docs.map((document) => document.id)
  }

  it('gives a player every start and end, newest first', async () => {
    expect(await fightIds('ayla')).toEqual(['f-2', 'f-1'])
  })

  it('leaves them out with a user filter', async () => {
    expect(await fightIds('ayla', 'ayla')).toBeNull()
  })
})
