import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { characterEffectSchema } from './effects'

const base = {
  characterId: 'ThorinAyla0123456789',
  uid: 'ayla',
  name: "Lord Vulfric's Valour",
  text: 'Deal d8 more damage per HD.',
  cursed: false,
  createdBy: 'ayla',
  createdAt: Timestamp.fromMillis(1000),
}

const card = { ...base, source: 'card', sourceId: 'h1' }
const word = { ...base, source: 'word', sourceId: 'use-1', name: 'Abyss' }
const own = { ...base, source: 'own', sourceId: null, name: 'Kutsal su', text: '+1 to saves.' }
const dm = { ...own, source: 'dm', createdBy: 'dana' }

describe('characterEffectSchema', () => {
  it.each([
    ['a card effect', card],
    ['a Cursed card effect', { ...card, cursed: true }],
    ['a card effect without text', { ...card, text: '' }],
    ['a word effect', word],
    ['an own effect', own],
    ['a DM effect', dm],
    ['a hand-made name of 60 Turkish letters', { ...own, name: 'ğ'.repeat(60) }],
    ['a pending creation time', { ...own, createdAt: null }],
    ['a Blessed card effect', { ...card, blessed: true }],
  ])('accepts %s', (_case, effect) => {
    expect(characterEffectSchema.safeParse(effect).success).toBe(true)
  })

  it.each([
    ['a hand-made name over 60', { ...own, name: 'x'.repeat(61) }],
    ['an empty hand-made text', { ...own, text: '' }],
    ['a hand-made text over 500', { ...dm, text: 'x'.repeat(501) }],
    ['an own effect that names a use', { ...own, sourceId: 'h1' }],
    ['a card effect that names no use', { ...card, sourceId: null }],
    ['a Cursed word effect', { ...word, cursed: true }],
    ['a Cursed DM effect', { ...dm, cursed: true }],
    ['an unknown source', { ...own, source: 'spell' }],
    ['an empty name', { ...card, name: '' }],
    ['a Blessed word effect', { ...word, blessed: true }],
    ['a Blessed own effect', { ...own, blessed: true }],
    ['a Blessed DM effect', { ...dm, blessed: true }],
    ['a card effect both Cursed and Blessed', { ...card, cursed: true, blessed: true }],
  ])('rejects %s', (_case, effect) => {
    expect(characterEffectSchema.safeParse(effect).success).toBe(false)
  })

  it('reads an effect stored before the Blessed mark as not Blessed', () => {
    const parsed = characterEffectSchema.parse(card)
    expect(parsed.blessed).toBe(false)
  })
})
