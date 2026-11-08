import { describe, expect, it } from 'vitest'

import { ablative, dative, genitive } from './turkish'

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

describe('dative', () => {
  it.each([
    ['Ayla', "Ayla'ya"],
    ['Bora', "Bora'ya"],
    ['Cem', "Cem'e"],
    ['Türkü', "Türkü'ye"],
    ['Gökay', "Gökay'a"],
    ['Umut', "Umut'a"],
    ['Ece', "Ece'ye"],
    ['İlker', "İlker'e"],
    ['Ahmet', "Ahmet'e"],
    ['XYZ', "XYZ'a"],
  ])('writes %s as %s', (name, expected) => {
    expect(dative(name)).toBe(expected)
  })
})

describe('ablative', () => {
  it.each([
    ['Ayla', "Ayla'dan"],
    ['Cem', "Cem'den"],
    ['Umut', "Umut'tan"],
    ['Gökay', "Gökay'dan"],
    ['Türkü', "Türkü'den"],
    ['Ahmet', "Ahmet'ten"],
    ['Göktürk', "Göktürk'ten"],
    ['Bora', "Bora'dan"],
    ['XYZ', "XYZ'dan"],
  ])('writes %s as %s', (name, expected) => {
    expect(ablative(name)).toBe(expected)
  })
})
