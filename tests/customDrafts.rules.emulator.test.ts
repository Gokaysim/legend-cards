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
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { startingFlags } from '../src/features/definitions/flags.ts'
import { memberContext, seedMembers } from '../src/test/members.ts'

// The rules of the Custom Card Draft (spec: custom-cards; design D1-D4, D8, D10 of add-custom-card-draft): the draft
// records among the draws, the open-draft lock at playerCustomDrafts/{uid}, their ledger entries, the Custom Cards in
// cards/{cardId} and their holdings in userCards/{holdingId}.

const PROJECT_ID = 'demo-legend-cards'

let testEnv: RulesTestEnvironment

function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

const asUser = (uid: string) => firestoreOf(memberContext(testEnv, uid))

async function asAdmin(work: (db: Firestore) => Promise<void>): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    await work(firestoreOf(admin))
  })
}

async function readAsAdmin(path: string): Promise<Record<string, unknown> | undefined> {
  let data: Record<string, unknown> | undefined
  await asAdmin(async (db) => {
    data = (await getDoc(doc(db, path))).data()
  })
  return data
}

/** The 18 effect types. */
const TYPES = [
  'Blessed',
  'Caster',
  'Combat',
  'Cursed',
  'Damage',
  'Discard',
  'Draw',
  'Effects',
  'Enhance',
  'Gain',
  'Gold',
  'Held',
  'Reduce',
  'Restore',
  'Roll',
  'Special',
  'TW',
  'XP',
]

/** Every type at every cost, but Held has no 5-cost text. */
const VARIANTS = Object.fromEntries(
  TYPES.map((type) => [
    type,
    type === 'Held'
      ? { '1': `${type} one.`, '3': `${type} three.` }
      : { '1': `${type} one.`, '3': `${type} three.`, '5': `${type} five.` },
  ]),
)

const LP_BEFORE: Record<string, number> = { ayla: 5, bora: 4, dana: 6 }

function seededUser(role: 'player' | 'dm', displayName: string, lp: number) {
  return {
    displayName,
    photoURL: null,
    role,
    createdAt: Timestamp.fromMillis(0),
    lp,
    lpEntryId: 'e-old',
  }
}

const CUSTOM_FLAGS = {
  ...startingFlags('custom', ''),
  hasHeldEffect: false,
  isKeptOnUse: false,
}

const effect = (type: string, cost: number) => ({ type, cost, text: `${type} at ${cost}.` })

/** A Custom Card as stored: Ayla's 3-cost card with Caster, Draw and Gold, held through `holdingId`. */
function customCard(holdingId: string, extra: Record<string, unknown> = {}) {
  return {
    kind: 'custom',
    name: '3-Cost Custom Card',
    nameKey: '3costcustomcard',
    setCode: null,
    cost: '3',
    rarity: null,
    mechanicPack: null,
    text: '',
    status: 'active',
    changeId: null,
    picture: null,
    ...CUSTOM_FLAGS,
    holder: { uid: 'ayla', userCardId: holdingId },
    base: 3,
    draftId: 'd-done',
    effects: [effect('Caster', 3), effect('Draw', 3), effect('Gold', 3)],
    ...extra,
  }
}

/** A holding as stored or written. */
function holding(overrides: Record<string, unknown>) {
  return {
    cardId: 'custom-plain',
    cardName: '3-Cost Custom Card',
    cardKind: 'custom',
    uid: 'ayla',
    givenAt: Timestamp.fromMillis(1000),
    givenBy: 'ayla',
    givenVia: 'draft',
    transferredFrom: null,
    drawId: 'd-done',
    active: false,
    note: '',
    costOverride: null,
    returnedAt: null,
    returnedBy: null,
    returnReason: null,
    usedOn: null,
    transferredTo: null,
    ...overrides,
  }
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
  await asAdmin(async (db) => {
    await setDoc(doc(db, 'users/ayla'), seededUser('player', 'Ayla', LP_BEFORE.ayla ?? 0))
    await setDoc(doc(db, 'users/bora'), seededUser('player', 'Bora', LP_BEFORE.bora ?? 0))
    await setDoc(doc(db, 'users/dana'), seededUser('dm', 'Dana', LP_BEFORE.dana ?? 0))
    await setDoc(doc(db, 'customEffects/main'), {
      variants: VARIANTS,
      importedAt: Timestamp.fromMillis(0),
    })
    // Two finished cards in Ayla's hand: a plain one and one with Held.
    await setDoc(doc(db, 'cards/custom-plain'), customCard('h-plain'))
    await setDoc(
      doc(db, 'cards/custom-held'),
      customCard('h-held', {
        effects: [effect('Caster', 3), effect('Held', 3), effect('Gold', 3)],
        hasHeldEffect: true,
        isKeptOnUse: true,
      }),
    )
    await setDoc(doc(db, 'userCards/h-plain'), holding({}))
    await setDoc(doc(db, 'userCards/h-held'), holding({ cardId: 'custom-held', active: true }))
  })
})

// ---------------------------------------------------------------------------------------------------------------
// Starting

/** A draft's fields at its start: Ayla's 3-cost draft for 3 LP, by `by`. */
function draftFields(by: string, overrides: Record<string, unknown> = {}) {
  return {
    kind: 'customDraft',
    uid: 'ayla',
    by,
    at: serverTimestamp(),
    base: 3,
    paidWith: 'lp',
    cost: 3,
    entryId: 'e-pay',
    pickTypes: [],
    pickCosts: [],
    offered: ['Caster', 'Draw', 'Gold'],
    offerCost: 3,
    required: 3,
    bonusLeft: 0,
    status: 'open',
    closedAt: null,
    closedBy: null,
    cardId: null,
    holdingId: null,
    refundEntryId: null,
    ...overrides,
  }
}

function draftEntry(by: string, overrides: Record<string, unknown> = {}) {
  return {
    currency: 'lp',
    account: 'ayla',
    delta: -3,
    balanceAfter: 2,
    source: 'customDraft',
    reason: null,
    drawId: 'd-new',
    by,
    at: serverTimestamp(),
    ...overrides,
  }
}

type StartSpec = {
  draft?: Record<string, unknown>
  /** Overrides of the entry, or `null` to write none. Written only when the draft is paid. */
  entry?: Record<string, unknown> | null
  /** Overrides of the new LP, or `null` to leave it alone. */
  balance?: Record<string, unknown> | null
  /** The lock, or `null` to leave it alone. */
  lock?: Record<string, unknown> | null
}

/** One start as the application writes it: the draft `d-new`, the lock, and when paid the entry and the new LP. */
function start(writer: string, spec: StartSpec = {}) {
  const db = asUser(writer)
  const fields = draftFields(writer, spec.draft)
  const uid = fields.uid
  const cost = Number(fields.cost)
  const lpAfter = (LP_BEFORE[uid] ?? 0) - cost
  const batch = writeBatch(db)
  batch.set(doc(db, 'draws/d-new'), fields)
  if (spec.lock !== null) {
    batch.set(doc(db, `playerCustomDrafts/${uid}`), { openDraftId: 'd-new', ...spec.lock })
  }
  if (fields.paidWith === 'lp' && spec.entry !== null) {
    batch.set(
      doc(db, 'ledger/e-pay'),
      draftEntry(writer, { account: uid, delta: -cost, balanceAfter: lpAfter, ...spec.entry }),
    )
  }
  if (fields.paidWith === 'lp' && spec.balance !== null) {
    batch.update(doc(db, `users/${uid}`), { lp: lpAfter, lpEntryId: 'e-pay', ...spec.balance })
  }
  return batch.commit()
}

const FREE = { paidWith: 'none', cost: 0, entryId: null }

describe('starting a Custom Card draft', () => {
  it('lets a player start their own draft for exactly its cost', async () => {
    await assertSucceeds(start('ayla'))
    expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 2, lpEntryId: 'e-pay' })
  })

  it("lets the DM start anyone's draft for any amount of their LP", async () => {
    await assertSucceeds(start('dana', { draft: { uid: 'bora', base: 5, offerCost: 5, cost: 4 } }))
  })

  it.each([
    ['a 1-cost draft', { base: 1, offerCost: 1, cost: 1 }],
    ['a 5-cost draft', { base: 5, offerCost: 5, cost: 5 }],
  ])('lets a player start %s for its price', async (_case, draft) => {
    await assertSucceeds(start('ayla', { draft }))
  })

  it('lets the DM start a free draft', async () => {
    await assertSucceeds(start('dana', { draft: { uid: 'bora', ...FREE } }))
  })

  it('lets the DM start a draft for their own hand', async () => {
    await assertSucceeds(start('dana', { draft: { uid: 'dana', cost: 2 } }))
  })

  it.each([
    ['another amount', { base: 5, offerCost: 5, cost: 1 }],
    ['nothing', FREE],
    ['more than the price', { cost: 4 }],
  ])('denies a player paying %s', async (_case, draft) => {
    await assertFails(start('ayla', { draft }))
  })

  it('denies the DM more LP than the user has', async () => {
    await assertFails(start('dana', { draft: { uid: 'bora', cost: 5 } }))
  })

  it('denies a player a draft for another player', async () => {
    await assertFails(start('ayla', { draft: { uid: 'bora', by: 'ayla' } }))
  })

  it('denies a start without its payment, its new LP or its lock', async () => {
    await assertFails(start('ayla', { entry: null }))
    await assertFails(start('ayla', { balance: null }))
    await assertFails(start('ayla', { lock: null }))
    await assertFails(start('ayla', { entry: { source: 'wordDraft' } }))
  })

  it.each([
    ['a cost of 2', { base: 2, offerCost: 2, cost: 2 }],
    ['no options', { offered: [] }],
    ['4 options', { offered: ['Caster', 'Draw', 'Gold', 'Roll'] }],
    ['an option twice', { offered: ['Caster', 'Caster', 'Gold'] }],
    ['an unknown type', { offered: ['Luck', 'Draw', 'Gold'] }],
    ['a type without a text at the cost', { base: 5, offerCost: 5, cost: 5, offered: ['Held'] }],
    ['a pick already', { pickTypes: ['Roll'], pickCosts: [3] }],
    ['a wrong step cost', { offerCost: 1 }],
    ['more picks needed', { required: 5 }],
    ['extra picks', { bonusLeft: 2 }],
    ['an extra field', { note: 'x' }],
    ['a finished status', { status: 'finished' }],
  ])('denies a draft with %s', async (_case, draft) => {
    await assertFails(start('ayla', { draft }))
  })

  it('denies a second open draft, and allows a True Word draft beside it', async () => {
    await asAdmin(async (db) => {
      await setDoc(doc(db, 'playerCustomDrafts/ayla'), { openDraftId: 'd-other' })
      for (const name of ['abyss', 'aid', 'dragon']) {
        await setDoc(doc(db, `cards/tw-${name}`), {
          kind: 'trueWord',
          name,
          nameKey: name,
          setCode: null,
          cost: '1',
          rarity: null,
          mechanicPack: null,
          text: `${name}.`,
          status: 'active',
          ...startingFlags('trueWord', ''),
        })
      }
    })
    await assertFails(start('ayla'))
    await assertFails(start('dana', { draft: { ...FREE } }))

    const db = asUser('ayla')
    const batch = writeBatch(db)
    batch.set(doc(db, 'draws/w-new'), {
      kind: 'wordDraft',
      uid: 'ayla',
      by: 'ayla',
      at: serverTimestamp(),
      offered: ['tw-abyss', 'tw-aid', 'tw-dragon'],
      status: 'open',
      paidWith: 'lp',
      cost: 1,
      entryId: 'e-word',
      closedAt: null,
      closedBy: null,
      learned: null,
      refundEntryId: null,
    })
    batch.set(doc(db, 'playerWords/ayla'), { known: {}, openDraftId: 'w-new', holdingId: null })
    batch.set(
      doc(db, 'ledger/e-word'),
      draftEntry('ayla', { source: 'wordDraft', delta: -1, balanceAfter: 4, drawId: 'w-new' }),
    )
    batch.update(doc(db, 'users/ayla'), { lp: 4, lpEntryId: 'e-word' })
    await assertSucceeds(batch.commit())
  })

  it("lets two players' drafts be open at once", async () => {
    await asAdmin(async (db) => {
      await setDoc(doc(db, 'playerCustomDrafts/ayla'), { openDraftId: 'd-other' })
    })
    await assertSucceeds(start('bora', { draft: { uid: 'bora' } }))
  })

  it('denies a start while a pack is open', async () => {
    await asAdmin(async (db) => {
      await setDoc(doc(db, 'table/main'), { openPackId: 'p-open' })
    })
    await assertFails(start('ayla'))
  })
})

// ---------------------------------------------------------------------------------------------------------------
// Picking

/** Ayla's open draft `d-open`, seeded: by default a paid 3-cost draft before its first pick. */
async function seedOpenDraft(overrides: Record<string, unknown> = {}) {
  await asAdmin(async (db) => {
    await setDoc(
      doc(db, 'draws/d-open'),
      draftFields('ayla', { at: Timestamp.fromMillis(5000), entryId: 'e-pay-old', ...overrides }),
    )
    await setDoc(doc(db, 'playerCustomDrafts/ayla'), { openDraftId: 'd-open' })
    await updateDoc(doc(db, 'users/ayla'), { lp: 2, lpEntryId: 'e-pay-old' })
  })
}

/** A pick that does not finish the draft, as the application writes it. */
function pick(writer: string, next: Record<string, unknown>) {
  return updateDoc(doc(asUser(writer), 'draws/d-open'), next)
}

/** After picking Caster at 3-cost from the default open draft: 1 of 3 picks, next options at 3-cost. */
const AFTER_CASTER = {
  pickTypes: ['Caster'],
  pickCosts: [3],
  offered: ['Draw', 'Gold', 'Roll'],
  offerCost: 3,
  required: 3,
  bonusLeft: 0,
}

describe('picking in a Custom Card draft', () => {
  beforeEach(async () => {
    await seedOpenDraft()
  })

  it('lets the player and the DM pick an offered type', async () => {
    await assertSucceeds(pick('ayla', AFTER_CASTER))
    await assertSucceeds(
      pick('dana', {
        pickTypes: ['Caster', 'Gold'],
        pickCosts: [3, 3],
        offered: ['Draw', 'Roll'],
      }),
    )
  })

  it('denies another player a pick', async () => {
    await assertFails(pick('bora', AFTER_CASTER))
  })

  it.each([
    ['a type not offered', { ...AFTER_CASTER, pickTypes: ['Roll'] }],
    ['a picked type offered again', { ...AFTER_CASTER, offered: ['Caster', 'Gold'] }],
    ['an option without a text', { ...AFTER_CASTER, offered: ['Luck'] }],
    ['4 options', { ...AFTER_CASTER, offered: ['Draw', 'Gold', 'Roll', 'XP'] }],
    ['a wrong pick cost', { ...AFTER_CASTER, pickCosts: [1] }],
    ['a wrong step cost', { ...AFTER_CASTER, offerCost: 1 }],
    ['a wrong number of picks', { ...AFTER_CASTER, required: 5 }],
    ['wrong extra picks', { ...AFTER_CASTER, bonusLeft: 2 }],
    ['two picks at once', { ...AFTER_CASTER, pickTypes: ['Caster', 'Draw'], pickCosts: [3, 3] }],
    ['a changed cost', { ...AFTER_CASTER, cost: 0 }],
    ['an ending without a card', { ...AFTER_CASTER, status: 'finished' }],
  ])('denies %s', async (_case, next) => {
    await assertFails(pick('ayla', next))
  })

  it('accepts a step with no option left: the draft waits for the DM', async () => {
    await assertSucceeds(pick('ayla', { ...AFTER_CASTER, offered: [] }))
  })

  it('counts the picks of Effects and a 3-cost Special', async () => {
    await seedOpenDraft({ offered: ['Effects', 'Special', 'Gold'] })
    await assertSucceeds(
      pick('ayla', {
        pickTypes: ['Effects'],
        pickCosts: [3],
        offered: ['Draw', 'Special'],
        required: 5,
      }),
    )
    await assertFails(
      pick('ayla', {
        pickTypes: ['Effects', 'Special'],
        pickCosts: [3, 3],
        offered: ['Draw'],
        required: 7,
        bonusLeft: 0,
      }),
    )
    await assertSucceeds(
      pick('ayla', {
        pickTypes: ['Effects', 'Special'],
        pickCosts: [3, 3],
        offered: ['Draw'],
        required: 7,
        bonusLeft: 2,
      }),
    )
    // The third pick starts the two 1-cost steps.
    await assertFails(
      pick('ayla', {
        pickTypes: ['Effects', 'Special', 'Draw'],
        pickCosts: [3, 3, 3],
        offered: ['Gold'],
        offerCost: 3,
      }),
    )
    await assertSucceeds(
      pick('ayla', {
        pickTypes: ['Effects', 'Special', 'Draw'],
        pickCosts: [3, 3, 3],
        offered: ['Gold'],
        offerCost: 1,
      }),
    )
  })

  it('counts 3 extra picks for Effects at 5-cost', async () => {
    await seedOpenDraft({ base: 5, offerCost: 5, cost: 5, offered: ['Effects', 'Draw'] })
    await assertFails(
      pick('ayla', {
        ...AFTER_CASTER,
        pickTypes: ['Effects'],
        pickCosts: [5],
        offerCost: 5,
        required: 5,
      }),
    )
    await assertSucceeds(
      pick('ayla', {
        ...AFTER_CASTER,
        pickTypes: ['Effects'],
        pickCosts: [5],
        offered: ['Draw'],
        offerCost: 5,
        required: 6,
      }),
    )
  })

  it('denies a pick while a pack is open', async () => {
    await asAdmin(async (db) => {
      await setDoc(doc(db, 'table/main'), { openPackId: 'p-open' })
    })
    await assertFails(pick('ayla', AFTER_CASTER))
  })
})

// ---------------------------------------------------------------------------------------------------------------
// Finishing

type FinishSpec = {
  /** The draft's update. Default: the third pick, Gold, of `d-open` after Caster and Draw. */
  draft?: Record<string, unknown> | null
  card?: Record<string, unknown> | null
  holding?: Record<string, unknown> | null
  lock?: Record<string, unknown> | null
}

/** Ayla's 3-cost draft after Caster and Draw, showing Gold, Roll and XP. */
const BEFORE_LAST = {
  pickTypes: ['Caster', 'Draw'],
  pickCosts: [3, 3],
  offered: ['Gold', 'Roll', 'XP'],
}

/** The last pick as the application writes it: the draft finished, the card, its holding and the lock. */
function finish(writer: string, spec: FinishSpec = {}) {
  const db = asUser(writer)
  const batch = writeBatch(db)
  if (spec.draft !== null) {
    batch.update(doc(db, 'draws/d-open'), {
      pickTypes: ['Caster', 'Draw', 'Gold'],
      pickCosts: [3, 3, 3],
      offered: [],
      status: 'finished',
      closedAt: serverTimestamp(),
      closedBy: writer,
      cardId: 'custom-new',
      holdingId: 'h-new',
      ...spec.draft,
    })
  }
  if (spec.card !== null) {
    batch.set(doc(db, 'cards/custom-new'), customCard('h-new', { draftId: 'd-open', ...spec.card }))
  }
  if (spec.holding !== null) {
    batch.set(
      doc(db, 'userCards/h-new'),
      holding({
        cardId: 'custom-new',
        givenAt: serverTimestamp(),
        givenBy: writer,
        drawId: 'd-open',
        ...spec.holding,
      }),
    )
  }
  if (spec.lock !== null) {
    batch.set(doc(db, 'playerCustomDrafts/ayla'), { openDraftId: null, ...spec.lock })
  }
  return batch.commit()
}

describe('finishing a Custom Card draft', () => {
  beforeEach(async () => {
    await seedOpenDraft(BEFORE_LAST)
  })

  it('lets the player make the card with the last pick, and the DM too', async () => {
    await assertSucceeds(finish('ayla'))
    expect(await readAsAdmin('cards/custom-new')).toMatchObject({ kind: 'custom', base: 3 })
    expect(await readAsAdmin('playerCustomDrafts/ayla')).toEqual({ openDraftId: null })
  })

  it('lets the DM make the card for the player', async () => {
    await assertSucceeds(finish('dana'))
  })

  it('makes a Held card act while held and stay on use', async () => {
    await seedOpenDraft({ ...BEFORE_LAST, offered: ['Held', 'Roll'] })
    const held = [effect('Caster', 3), effect('Draw', 3), effect('Held', 3)]
    await assertFails(
      finish('ayla', { draft: { pickTypes: ['Caster', 'Draw', 'Held'] }, card: { effects: held } }),
    )
    await assertSucceeds(
      finish('ayla', {
        draft: { pickTypes: ['Caster', 'Draw', 'Held'] },
        card: { effects: held, hasHeldEffect: true, isKeptOnUse: true },
        holding: { active: true },
      }),
    )
  })

  it('denies another player the last pick', async () => {
    await assertFails(finish('bora'))
  })

  it('denies a card written without the draft finishing', async () => {
    await assertFails(finish('ayla', { draft: null }))
    await assertFails(finish('ayla', { draft: null, holding: null, lock: null }))
  })

  it('denies a finish without the card, the holding or the cleared lock', async () => {
    await assertFails(finish('ayla', { card: null }))
    await assertFails(finish('ayla', { holding: null }))
    await assertFails(finish('ayla', { lock: null }))
  })

  it('denies a card before the last pick', async () => {
    await seedOpenDraft({ pickTypes: ['Caster'], pickCosts: [3], offered: ['Draw', 'Gold'] })
    await assertFails(
      finish('ayla', {
        draft: { pickTypes: ['Caster', 'Draw'], pickCosts: [3, 3] },
        card: { effects: [effect('Caster', 3), effect('Draw', 3)] },
      }),
    )
  })

  it.each([
    ['other types', { effects: [effect('Caster', 3), effect('Draw', 3), effect('Roll', 3)] }],
    [
      'the types in another order',
      { effects: [effect('Draw', 3), effect('Caster', 3), effect('Gold', 3)] },
    ],
    ['a missing effect', { effects: [effect('Caster', 3), effect('Draw', 3)] }],
    [
      'an effect at 2-cost',
      { effects: [effect('Caster', 3), effect('Draw', 3), effect('Gold', 2)] },
    ],
    [
      'an empty text',
      { effects: [effect('Caster', 3), effect('Draw', 3), { ...effect('Gold', 3), text: '' }] },
    ],
    ['another holder', { holder: { uid: 'bora', userCardId: 'h-new' } }],
    ['another draft cost', { base: 5 }],
    ['another name', { name: 'My Card' }],
    ['a text', { text: 'Caster.' }],
    ['a draw flag on', { isInDraws: true }],
    ['a list flag on', { isInLibrary: true }],
    ['a repeatable card', { isRepeatable: true }],
    ['Held flags without Held', { hasHeldEffect: true, isKeptOnUse: true }],
    ['a set', { setCode: 'Kesqer' }],
    ['a change record', { changeId: 'c-1' }],
    ['an extra field', { lore: 'x' }],
  ])('denies a card with %s', async (_case, card) => {
    await assertFails(finish('ayla', { card }))
  })

  it('denies a card that the draft does not name', async () => {
    await assertFails(finish('ayla', { draft: { cardId: 'custom-other' } }))
  })

  it('denies a holding for another hand or another card', async () => {
    await assertFails(finish('ayla', { holding: { uid: 'bora' } }))
    await assertFails(finish('ayla', { holding: { active: true } }))
    await assertFails(finish('ayla', { holding: { cardName: 'Other' } }))
  })
})

describe('the largest request', () => {
  it('lets the DM finish a 3-cost draft with Effects and Special in 7 picks', async () => {
    await seedOpenDraft({
      pickTypes: ['Effects', 'Special', 'Draw', 'Gold', 'Roll', 'XP'],
      pickCosts: [3, 3, 3, 1, 1, 3],
      offered: ['Caster', 'Combat', 'Damage'],
      offerCost: 3,
      required: 7,
      bonusLeft: 0,
    })
    const types = ['Effects', 'Special', 'Draw', 'Gold', 'Roll', 'XP', 'Caster']
    const costs = [3, 3, 3, 1, 1, 3, 3]
    await assertSucceeds(
      finish('dana', {
        draft: { pickTypes: types, pickCosts: costs },
        card: {
          cost: '5',
          effects: types.map((type, index) => effect(type, costs[index] ?? 3)),
        },
      }),
    )
  })
})

// ---------------------------------------------------------------------------------------------------------------
// Cancelling and ended drafts

/** Cancelling `d-open`: with a refund of 3 LP (2 -> 5) as `e-refund`, or without one. */
function cancel(writer: string, { paid = true, lock = true } = {}) {
  const db = asUser(writer)
  const batch = writeBatch(db)
  batch.update(doc(db, 'draws/d-open'), {
    status: 'cancelled',
    closedAt: serverTimestamp(),
    closedBy: writer,
    refundEntryId: paid ? 'e-refund' : null,
  })
  if (paid) {
    batch.set(
      doc(db, 'ledger/e-refund'),
      draftEntry(writer, { delta: 3, balanceAfter: 5, drawId: 'd-open' }),
    )
    batch.update(doc(db, 'users/ayla'), { lp: 5, lpEntryId: 'e-refund' })
  }
  if (lock) batch.set(doc(db, 'playerCustomDrafts/ayla'), { openDraftId: null })
  return batch.commit()
}

describe('cancelling a Custom Card draft', () => {
  beforeEach(async () => {
    await seedOpenDraft()
  })

  it('lets the DM cancel with a full refund', async () => {
    await assertSucceeds(cancel('dana'))
    expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 5 })
  })

  it('denies the player a cancel', async () => {
    await assertFails(cancel('ayla'))
  })

  it('denies a cancel without the refund or the cleared lock', async () => {
    await assertFails(cancel('dana', { paid: false }))
    await assertFails(cancel('dana', { lock: false }))
  })

  it('lets the DM cancel a free draft without a refund', async () => {
    await seedOpenDraft(FREE)
    await assertSucceeds(cancel('dana', { paid: false }))
  })

  it('denies a cancel while a pack is open', async () => {
    await asAdmin(async (db) => {
      await setDoc(doc(db, 'table/main'), { openPackId: 'p-open' })
    })
    await assertFails(cancel('dana'))
  })

  it('never changes or deletes an ended draft', async () => {
    await assertSucceeds(cancel('dana'))
    await assertFails(updateDoc(doc(asUser('dana'), 'draws/d-open'), { status: 'open' }))
    await assertFails(pick('dana', AFTER_CASTER))
    await assertFails(deleteDoc(doc(asUser('dana'), 'draws/d-open')))
  })
})

describe('the open-draft lock', () => {
  it('denies a lock written without its draft', async () => {
    await assertFails(
      setDoc(doc(asUser('ayla'), 'playerCustomDrafts/ayla'), { openDraftId: 'd-x' }),
    )
    await assertFails(setDoc(doc(asUser('dana'), 'playerCustomDrafts/ayla'), { openDraftId: null }))
  })

  it('lets every member read it', async () => {
    await assertSucceeds(getDoc(doc(asUser('bora'), 'playerCustomDrafts/ayla')))
  })
})

// ---------------------------------------------------------------------------------------------------------------
// A finished Custom Card

/** A definition change record as the DM writes it for a Custom Card's effect edit. */
function snapshotOf(card: Record<string, unknown>) {
  const keys = [
    'kind',
    'name',
    'nameKey',
    'setCode',
    'cost',
    'rarity',
    'mechanicPack',
    'text',
    'status',
    'picture',
    'isInLibrary',
    'isInDraws',
    'isInSetPacks',
    'isInMechanicPacks',
    'isRepeatable',
    'hasHeldEffect',
    'hasUseEffect',
    'isKeptOnUse',
  ]
  return Object.fromEntries(keys.map((key) => [key, card[key] ?? null]))
}

function editEffects(writer: string, next: Record<string, unknown>, { record = true } = {}) {
  const db = asUser(writer)
  const before = customCard('h-plain')
  const after = { ...before, ...next, changeId: 'c-edit' }
  const batch = writeBatch(db)
  batch.update(doc(db, 'cards/custom-plain'), { ...next, changeId: 'c-edit' })
  if (record) {
    batch.set(doc(db, 'definitionChanges/c-edit'), {
      target: 'card',
      targetId: 'custom-plain',
      name: '3-Cost Custom Card',
      step: 'edited',
      before: snapshotOf(before),
      after: snapshotOf(after),
      public: false,
      by: writer,
      at: serverTimestamp(),
    })
  }
  return batch.commit()
}

describe("a Custom Card's effects", () => {
  const withRoll = {
    effects: [effect('Caster', 3), effect('Draw', 3), effect('Gold', 3), effect('Roll', 1)],
  }

  it('lets the DM add an effect with its change record', async () => {
    await assertSucceeds(editEffects('dana', withRoll))
  })

  it('lets the DM add Held, turning both Held flags on', async () => {
    await assertSucceeds(
      editEffects('dana', {
        effects: [...withRoll.effects, effect('Held', 1)],
        hasHeldEffect: true,
        isKeptOnUse: true,
      }),
    )
  })

  it('denies a player an edit', async () => {
    await assertFails(editEffects('ayla', withRoll))
  })

  it.each([
    ['without its record', withRoll, { record: false }],
    ['with no effect left', { effects: [] }, {}],
    ['with one Held flag only', { ...withRoll, hasHeldEffect: true }, {}],
    ['of its name', { name: 'Mine' }, {}],
    ['of its draft cost', { base: 5 }, {}],
    ['of a draw flag', { isInDraws: true }, {}],
  ])('denies the DM an edit %s', async (_case, next, options) => {
    await assertFails(editEffects('dana', next, options))
  })

  it('denies the DM retiring or deleting a Custom Card', async () => {
    await assertFails(
      updateDoc(doc(asUser('dana'), 'cards/custom-plain'), { status: 'retired', changeId: 'c-r' }),
    )
    await assertFails(deleteDoc(doc(asUser('dana'), 'cards/custom-plain')))
  })
})

describe('using, discarding and moving a Custom Card', () => {
  /** Closing `h-plain` as `reason` by `writer`, with the card's holder released. */
  function close(writer: string, fields: Record<string, unknown>, pay?: number) {
    const db = asUser(writer)
    const batch = writeBatch(db)
    batch.update(doc(db, 'userCards/h-plain'), {
      returnedAt: serverTimestamp(),
      returnedBy: writer,
      usedOn: null,
      ...fields,
    })
    batch.update(doc(db, 'cards/custom-plain'), { holder: null })
    if (pay !== undefined) {
      batch.set(doc(db, 'ledger/e-use'), {
        currency: 'lp',
        account: 'ayla',
        delta: -pay,
        balanceAfter: 5 - pay,
        source: 'use',
        reason: null,
        drawId: 'h-plain',
        by: writer,
        at: serverTimestamp(),
      })
      batch.update(doc(db, 'users/ayla'), { lp: 5 - pay, lpEntryId: 'e-use' })
    }
    return batch.commit()
  }

  it('lets the holder use it for its cost: its holding closes, and nothing returns to a pool', async () => {
    await assertSucceeds(
      close(
        'ayla',
        { returnReason: 'used', useCost: 3, useEntryId: 'e-use', usedOnCharacterId: null },
        3,
      ),
    )
    expect(await readAsAdmin('cards/custom-plain')).toMatchObject({ holder: null })
  })

  it('lets the holder discard it', async () => {
    await assertSucceeds(close('ayla', { returnReason: 'discarded' }))
  })

  it('denies the DM giving it again once it is gone', async () => {
    await assertSucceeds(close('ayla', { returnReason: 'discarded' }))
    const db = asUser('dana')
    const batch = writeBatch(db)
    batch.set(
      doc(db, 'userCards/h-again'),
      holding({ givenAt: serverTimestamp(), givenBy: 'dana', givenVia: 'dm', drawId: null }),
    )
    batch.update(doc(db, 'cards/custom-plain'), { holder: { uid: 'ayla', userCardId: 'h-again' } })
    await assertFails(batch.commit())
  })

  it('records a use of a Held card, which stays in the hand', async () => {
    const db = asUser('dana')
    await assertSucceeds(
      setDoc(doc(db, 'uses/u-1'), {
        uid: 'ayla',
        cardId: 'custom-held',
        cardName: '3-Cost Custom Card',
        cardKind: 'custom',
        holdingId: 'h-held',
        by: 'dana',
        at: serverTimestamp(),
        cost: 0,
        entryId: null,
      }),
    )
  })

  it('lets the DM transfer it, and denies a player', async () => {
    const transfer = (writer: string) => {
      const db = asUser(writer)
      const batch = writeBatch(db)
      batch.update(doc(db, 'userCards/h-plain'), {
        returnedAt: serverTimestamp(),
        returnedBy: writer,
        returnReason: 'transferred',
        transferredTo: 'h-bora',
      })
      batch.set(
        doc(db, 'userCards/h-bora'),
        holding({
          uid: 'bora',
          givenAt: serverTimestamp(),
          givenBy: writer,
          givenVia: 'transfer',
          transferredFrom: 'h-plain',
          drawId: null,
        }),
      )
      batch.update(doc(db, 'cards/custom-plain'), { holder: { uid: 'bora', userCardId: 'h-bora' } })
      return batch.commit()
    }
    await assertFails(transfer('ayla'))
    await assertSucceeds(transfer('dana'))
  })
})
