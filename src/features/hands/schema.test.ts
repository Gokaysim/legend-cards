import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { holdingSchema } from './schema'

const open = {
  cardId: 'legend-abolethseyes',
  cardName: "Aboleth's Eyes",
  cardKind: 'normal',
  uid: 'ayla',
  givenAt: Timestamp.fromMillis(1000),
  givenBy: 'dana',
  givenVia: 'dm',
  transferredFrom: null,
  active: false,
  note: '',
  costOverride: null,
  returnedAt: null,
  returnedBy: null,
  returnReason: null,
  usedOn: null,
  transferredTo: null,
}

const used = {
  ...open,
  returnedAt: Timestamp.fromMillis(2000),
  returnedBy: 'ayla',
  returnReason: 'used',
  usedOn: 'Thorin',
}

const transferred = {
  ...open,
  returnedAt: Timestamp.fromMillis(2000),
  returnedBy: 'dana',
  returnReason: 'transferred',
  transferredTo: 'holding-2',
}

describe('holdingSchema', () => {
  it.each([
    ['an open holding', open],
    ['a holding closed as used on a character', used],
    ['a holding closed as used without a character', { ...used, usedOn: null }],
    ['a discarded holding', { ...used, returnReason: 'discarded', usedOn: null }],
    ['a holding closed as transferred', transferred],
    [
      'a holding that continues a transfer',
      { ...open, givenVia: 'transfer', transferredFrom: 'h1' },
    ],
    [
      'an active Cursed holding with a note and a cost',
      {
        ...open,
        cardKind: 'cursed',
        active: true,
        note: 'Boss savaşında kullan',
        costOverride: 'd6',
      },
    ],
    ['a holding whose server times are still pending', { ...open, givenAt: null }],
  ])('accepts %s', (_case, holding) => {
    expect(holdingSchema.safeParse(holding).success).toBe(true)
  })

  it.each([
    ['an unknown givenVia', { ...open, givenVia: 'initial' }],
    ['a note over 1000 characters', { ...open, note: 'x'.repeat(1001) }],
    ['usedOn on an open holding', { ...open, usedOn: 'Thorin' }],
    ['usedOn on a discarded holding', { ...used, returnReason: 'discarded' }],
    ['usedOn on a transferred holding', { ...transferred, usedOn: 'Thorin' }],
    ['a usedOn over 100 characters', { ...used, usedOn: 'x'.repeat(101) }],
    ['a cost override over 10 characters', { ...open, costOverride: '12345678901' }],
    ['an empty cost override', { ...open, costOverride: '' }],
    ['an unknown return reason', { ...used, returnReason: 'lost', usedOn: null }],
    ['an unknown card kind', { ...open, cardKind: 'legendary' }],
    ['a transfer without the holding it continues', { ...open, givenVia: 'transfer' }],
    ['a dm give that continues a holding', { ...open, transferredFrom: 'h1' }],
    ['a closed holding without the user who closed it', { ...used, returnedBy: null }],
    [
      'a holding closed as transferred without the new holding',
      { ...transferred, transferredTo: null },
    ],
    ['an open holding that names a new holding', { ...open, transferredTo: 'h2' }],
    ['a missing field', { ...open, active: undefined }],
    ['a given time that is not a timestamp', { ...open, givenAt: 1000 }],
  ])('rejects %s', (_case, holding) => {
    expect(holdingSchema.safeParse(holding).success).toBe(false)
  })
})
