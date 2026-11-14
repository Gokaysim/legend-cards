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
  /** A learned word as stored: taught by the DM unless `draftId` names its draft, and maybe taken back. */
  function storedRecord(
    uid: string,
    learnedAt: number,
    {
      draftId = null,
      removedAt = null,
    }: { draftId?: string | null; removedAt?: number | null } = {},
  ) {
    return {
      wordId: 'tw-abyss',
      wordName: 'Abyss',
      uid,
      learnedAt: at(learnedAt),
      learnedBy: draftId === null ? 'dana' : uid,
      learnedVia: draftId === null ? 'dm' : 'draft',
      draftId,
      active: false,
      removedAt: removedAt === null ? null : at(removedAt),
      removedBy: removedAt === null ? null : 'dana',
    }
  }

  /** A paid draft for `uid` that ended with a learned word. */
  function storedDraft(uid: string, millis: number) {
    return {
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
      learned: { wordId: 'tw-abyss', wordName: 'Abyss', recordId: `r-${uid}-draft` },
      refundEntryId: null,
    }
  }

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await setDoc(doc(db, 'wordDrafts/w-ayla'), storedDraft('ayla', 20000))
      await setDoc(doc(db, 'wordDrafts/w-bora'), storedDraft('bora', 21000))
      // Learned from the drafts: part of their events.
      await setDoc(
        doc(db, 'userTrueWords/r-ayla-draft'),
        storedRecord('ayla', 20100, { draftId: 'w-ayla' }),
      )
      await setDoc(
        doc(db, 'userTrueWords/r-bora-draft'),
        storedRecord('bora', 21100, { draftId: 'w-bora' }),
      )
      // Taught by the DM; Ayla's later taken back.
      await setDoc(
        doc(db, 'userTrueWords/r-ayla-taught'),
        storedRecord('ayla', 22000, { removedAt: 24000 }),
      )
      await setDoc(doc(db, 'userTrueWords/r-bora-taught'), storedRecord('bora', 23000))
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

  async function wordIds(uid: string | null, n: number) {
    const db = firestoreOf(testEnv.authenticatedContext('ayla'))
    const queries = logQueries(db, uid, n, false)
    const idsOf = async <T>(query: Query<T>) =>
      (await getDocs(query)).docs.map((document) => document.id)
    return {
      drafts: await idsOf(queries.drafts),
      taught: await idsOf(queries.taught),
      takenBack: await idsOf(queries.takenBack),
      entries: await idsOf(queries.entries),
    }
  }

  it('return the drafts, and the taught and taken-back words, without the words learned in drafts or their payments', async () => {
    expect(await wordIds(null, 50)).toEqual({
      drafts: ['w-bora', 'w-ayla'],
      taught: ['r-bora-taught', 'r-ayla-taught'],
      takenBack: ['r-ayla-taught'],
      entries: ['gp', 'lp-bora', 'lp-ayla'],
    })
  })

  it("keep only one user's", async () => {
    expect(await wordIds('ayla', 50)).toEqual({
      drafts: ['w-ayla'],
      taught: ['r-ayla-taught'],
      takenBack: ['r-ayla-taught'],
      entries: ['lp-ayla'],
    })
  })

  it('stop at n', async () => {
    expect(await wordIds(null, 1)).toMatchObject({ drafts: ['w-bora'], taught: ['r-bora-taught'] })
  })
})

describe('the log queries of uses and their payments', () => {
  /** A use of Abyss by `uid` at `millis`, paid with `pay-<id>`. */
  function storedWordUse(uid: string, millis: number) {
    return {
      uid,
      wordId: 'tw-abyss',
      wordName: 'Abyss',
      recordId: `r-${uid}`,
      by: uid,
      at: at(millis),
      cost: 2,
      entryId: `pay-u-${uid}`,
    }
  }

  /** A use payment as stored: `source` of a card's or a word's use, for the record `drawId`. */
  function storedPayment(
    account: string,
    millis: number,
    source: 'use' | 'wordUse',
    drawId: string,
  ) {
    return { ...storedEntry(account, millis), delta: -2, source, reason: null, drawId }
  }

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await setDoc(doc(db, 'wordUses/u-ayla'), storedWordUse('ayla', 30000))
      await setDoc(doc(db, 'wordUses/u-bora'), storedWordUse('bora', 31000))
      await setDoc(doc(db, 'ledger/pay-u-ayla'), storedPayment('ayla', 30000, 'wordUse', 'u-ayla'))
      await setDoc(doc(db, 'ledger/pay-a-used'), storedPayment('ayla', 6000, 'use', 'a-used'))
    })
  })

  async function useIds(uid: string | null, n: number) {
    const db = firestoreOf(testEnv.authenticatedContext('ayla'))
    const queries = logQueries(db, uid, n, false)
    const idsOf = async <T>(query: Query<T>) =>
      (await getDocs(query)).docs.map((document) => document.id)
    return {
      wordUses: await idsOf(queries.wordUses),
      closed: await idsOf(queries.closed),
      entries: await idsOf(queries.entries),
    }
  }

  it('return the word uses, newest first, and never a use payment as a change by hand', async () => {
    expect(await useIds(null, 50)).toEqual({
      wordUses: ['u-bora', 'u-ayla'],
      closed: ['a-used', 'b-used'],
      entries: ['gp', 'lp-bora', 'lp-ayla'],
    })
  })

  it("keep only one user's uses, and stop at n", async () => {
    expect(await useIds('ayla', 50)).toEqual({
      wordUses: ['u-ayla'],
      closed: ['a-used'],
      entries: ['lp-ayla'],
    })
    expect((await useIds(null, 1)).wordUses).toEqual(['u-bora'])
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
