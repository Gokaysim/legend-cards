import { describe, expect, it } from 'vitest'

import { openTabOf, paramsOf, tabKey } from './handTabs'

const params = (search: string) => new URLSearchParams(search)
const THORIN = 'Thorin00000000000000'
const KUZGUN = 'Kuzgun00000000000000'

describe('openTabOf', () => {
  it.each([
    ['no parameter', '', { kind: 'cards' }],
    ['the True Words tab', '?tab=true-words', { kind: 'true-words' }],
    ['an active character', `?character=${KUZGUN}`, { kind: 'character', id: KUZGUN }],
    ['an archived or unknown character', '?character=Ghost', { kind: 'character', id: THORIN }],
    ['the former Karakterler tab', '?tab=characters', { kind: 'character', id: THORIN }],
    ['the former Notlar tab', '?tab=notes', { kind: 'cards' }],
    ['the DM notu tab, for a player', '?tab=dm-note', { kind: 'cards' }],
  ])('opens %s', (_case, search, tab) => {
    expect(openTabOf(params(search), false, [THORIN, KUZGUN])).toEqual(tab)
  })

  it('opens the DM notu tab for the DM', () => {
    expect(openTabOf(params('?tab=dm-note'), true, [])).toEqual({ kind: 'dm-note' })
  })

  it('opens the Kartlar tab for a character, or the former Karakterler tab, without characters', () => {
    expect(openTabOf(params(`?character=${THORIN}`), false, [])).toEqual({ kind: 'cards' })
    expect(openTabOf(params('?tab=characters'), false, [])).toEqual({ kind: 'cards' })
  })

  it('stays on the named character while the characters load', () => {
    expect(openTabOf(params(`?character=${THORIN}`), false, null)).toEqual({
      kind: 'character',
      id: THORIN,
    })
  })
})

describe('paramsOf', () => {
  it('writes each tab, dropping the other tab parameters and keeping the rest', () => {
    const current = params(`?tab=true-words&character=${THORIN}&x=1`)
    expect(paramsOf(current, { kind: 'cards' }).toString()).toBe('x=1')
    expect(paramsOf(current, { kind: 'dm-note' }).toString()).toBe('x=1&tab=dm-note')
    expect(paramsOf(current, { kind: 'character', id: KUZGUN }).toString()).toBe(
      `x=1&character=${KUZGUN}`,
    )
  })
})

describe('tabKey', () => {
  it('names each tab', () => {
    expect(tabKey({ kind: 'cards' })).toBe('cards')
    expect(tabKey({ kind: 'character', id: THORIN })).toBe(`character-${THORIN}`)
  })
})
