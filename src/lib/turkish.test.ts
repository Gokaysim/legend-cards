import { describe, expect, it } from 'vitest'

import { genitive } from './turkish'

describe('genitive', () => {
  it.each([
    ['Ayla', "Ayla'nın"],
    ['Bora', "Bora'nın"],
    ['Cem', "Cem'in"],
    ['Deniz', "Deniz'in"],
    ['Gökay', "Gökay'ın"],
    ['Umut', "Umut'un"],
    ['Türkü', "Türkü'nün"],
    ['Göktürk', "Göktürk'ün"],
    ['Ece', "Ece'nin"],
    ['İlker', "İlker'in"],
    ['IŞIK', "IŞIK'ın"],
    ['Jo', "Jo'nun"],
    ['XYZ', "XYZ'ın"],
  ])('writes %s as %s', (name, expected) => {
    expect(genitive(name)).toBe(expected)
  })
})
