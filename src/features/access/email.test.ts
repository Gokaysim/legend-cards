import { describe, expect, it } from 'vitest'

import { EMAIL_MAX, isValidEmail, normalizeEmail } from './email'

describe('normalizeEmail', () => {
  it('removes surrounding spaces and lowercases the address', () => {
    expect(normalizeEmail('  Ayla@Gmail.COM ')).toBe('ayla@gmail.com')
  })
})

describe('isValidEmail', () => {
  it.each(['ayla@gmail.com', 'oyuncu.1@example.com', 'o+tag@mail.example.co'])(
    'accepts %s',
    (email) => {
      expect(isValidEmail(email)).toBe(true)
    },
  )

  it.each([
    ['capital letters', 'Ayla@gmail.com'],
    ['a space', 'ay la@gmail.com'],
    ['no "@"', 'ayla.gmail.com'],
    ['two "@"', 'ayla@@gmail.com'],
    ['no dot after the "@"', 'ayla@gmail'],
    ['a "/"', 'ay/la@gmail.com'],
    ['nothing before the "@"', '@gmail.com'],
    ['nothing after the last dot', 'ayla@gmail.'],
    ['nothing at all', ''],
  ])('refuses an address with %s', (_, email) => {
    expect(isValidEmail(email)).toBe(false)
  })

  it(`accepts ${EMAIL_MAX} characters and refuses ${EMAIL_MAX + 1}`, () => {
    const domain = '@example.com'
    expect(isValidEmail(`${'a'.repeat(EMAIL_MAX - domain.length)}${domain}`)).toBe(true)
    expect(isValidEmail(`${'a'.repeat(EMAIL_MAX + 1 - domain.length)}${domain}`)).toBe(false)
  })
})
