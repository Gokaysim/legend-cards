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
  drawId: null,
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
    ['a drawn holding', { ...open, givenBy: 'ayla', givenVia: 'draw', drawId: 'draw-1' }],
    [
      'a holding chosen from a pack',
      { ...open, givenBy: 'ayla', givenVia: 'pack', drawId: 'pack-1' },
    ],
    ['a paid use', { ...used, useCost: 2, useEntryId: 'entry-1' }],
    ['a free use', { ...used, useCost: 0, useEntryId: null }],
    ['a use on a character', { ...used, useCost: 0, usedOnCharacterId: 'char-1' }],
    ['a use on a typed name', { ...used, useCost: 0, usedOnCharacterId: null }],
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
    ['a drawn holding without its draw', { ...open, givenVia: 'draw' }],
    ['a dm give that names a draw', { ...open, drawId: 'draw-1' }],
    ['a pack holding without its pack opening', { ...open, givenVia: 'pack' }],
    [
      'a transfer that names a draw',
      { ...open, givenVia: 'transfer', transferredFrom: 'h1', drawId: 'draw-1' },
    ],
    ['a payment on an open holding', { ...open, useCost: 0 }],
    [
      'a payment on a discarded holding',
      { ...used, returnReason: 'discarded', usedOn: null, useCost: 0 },
    ],
    ['a paid use without its entry', { ...used, useCost: 2, useEntryId: null }],
    ['a free use that names an entry', { ...used, useCost: 0, useEntryId: 'entry-1' }],
    ['an entry without a payment', { ...used, useEntryId: 'entry-1' }],
    ['a negative payment', { ...used, useCost: -1, useEntryId: 'entry-1' }],
    ['a fractional payment', { ...used, useCost: 1.5, useEntryId: 'entry-1' }],
    ['a character on an open holding', { ...open, usedOnCharacterId: 'char-1' }],
    [
      'a character on a discarded holding',
      { ...used, returnReason: 'discarded', usedOn: null, usedOnCharacterId: 'char-1' },
    ],
    ['a character without its name', { ...used, usedOn: null, usedOnCharacterId: 'char-1' }],
    ['an empty character ID', { ...used, usedOnCharacterId: '' }],
  ])('rejects %s', (_case, holding) => {
    expect(holdingSchema.safeParse(holding).success).toBe(false)
  })

  it('reads a stored holding without drawId as null', () => {
    const { drawId: _drawId, ...stored } = open
    const result = holdingSchema.safeParse(stored)
    expect(result.success && result.data.drawId).toBeNull()
  })

  it('reads a used holding from before payments as one without a payment', () => {
    const result = holdingSchema.safeParse(used)
    expect(result.success && [result.data.useCost, result.data.useEntryId]).toEqual([null, null])
  })

  it('reads a used holding from before characters as one without a character', () => {
    const result = holdingSchema.safeParse(used)
    expect(result.success && result.data.usedOnCharacterId).toBeNull()
  })
})
