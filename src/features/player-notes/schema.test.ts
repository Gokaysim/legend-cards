import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { hasNoteText, type Note, NOTE_LIMITS, noteSchema } from './schema'

const note: Note = {
  text: 'Kayıp kardeşini arıyor.\nKılıcı ailesinden.',
  updatedBy: 'ayla',
  updatedAt: Timestamp.fromMillis(1000),
}

describe('noteSchema', () => {
  it.each([
    ['a note', note],
    ['a pending server time', { ...note, updatedAt: null }],
    ['an empty text', { ...note, text: '' }],
    ['a text at the limit', { ...note, text: 'ğ'.repeat(NOTE_LIMITS.text) }],
  ])('accepts %s', (_case, value) => {
    expect(noteSchema.safeParse(value).success).toBe(true)
  })

  it.each([
    ['a text over the limit', { ...note, text: 'x'.repeat(NOTE_LIMITS.text + 1) }],
    ['a missing text', { updatedBy: note.updatedBy, updatedAt: note.updatedAt }],
    ['a missing editor', { text: note.text, updatedAt: note.updatedAt }],
    ['an empty editor', { ...note, updatedBy: '' }],
    ['a missing time', { text: note.text, updatedBy: note.updatedBy }],
    ['a time that is not a timestamp', { ...note, updatedAt: '2026-11-09' }],
  ])('rejects %s', (_case, value) => {
    expect(noteSchema.safeParse(value).success).toBe(false)
  })
})

describe('hasNoteText', () => {
  it('is false for a missing note', () => {
    expect(hasNoteText(null)).toBe(false)
  })

  it('is false for a note with only spaces and line breaks', () => {
    expect(hasNoteText({ ...note, text: '  \n\t ' })).toBe(false)
  })

  it('is true for a note with text', () => {
    expect(hasNoteText(note)).toBe(true)
  })
})
