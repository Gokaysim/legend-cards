import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { loreText } from './api'
import { type Lore, LORE_LIMIT, loreSchema } from './schema'

const lore: Lore = {
  text: 'Derin suların efendisi.\n\nGözleri hâlâ bakıyor.',
  updatedBy: 'dana',
  updatedAt: Timestamp.fromMillis(1000),
}

describe('loreSchema', () => {
  it.each([
    ['lore', lore],
    ['a pending server time', { ...lore, updatedAt: null }],
    ['a text at the limit', { ...lore, text: 'ğ'.repeat(LORE_LIMIT) }],
    ['emoji at the limit, counted once each', { ...lore, text: '🐙'.repeat(LORE_LIMIT) }],
  ])('accepts %s', (_case, value) => {
    expect(loreSchema.safeParse(value).success).toBe(true)
  })

  it.each([
    ['an empty text', { ...lore, text: '' }],
    ['a text over the limit', { ...lore, text: 'x'.repeat(LORE_LIMIT + 1) }],
    ['a missing text', { updatedBy: lore.updatedBy, updatedAt: lore.updatedAt }],
    ['a missing editor', { text: lore.text, updatedAt: lore.updatedAt }],
    ['an empty editor', { ...lore, updatedBy: '' }],
    ['a missing time', { text: lore.text, updatedBy: lore.updatedBy }],
    ['a time that is not a timestamp', { ...lore, updatedAt: '2026-11-19' }],
  ])('rejects %s', (_case, value) => {
    expect(loreSchema.safeParse(value).success).toBe(false)
  })
})

describe('loreText', () => {
  it('keeps the line breaks inside and trims the text around them', () => {
    expect(loreText('  \nBir.\n\nİki.\n  ')).toBe('Bir.\n\nİki.')
  })

  it('is empty for blank text', () => {
    expect(loreText(' \n\t ')).toBe('')
  })

  it('cuts at the limit by code points', () => {
    expect(Array.from(loreText('🐙'.repeat(LORE_LIMIT + 5)))).toHaveLength(LORE_LIMIT)
  })
})
