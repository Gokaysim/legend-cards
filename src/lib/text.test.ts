import { describe, expect, it } from 'vitest'

import { cleanText } from './text'

describe('cleanText', () => {
  it('trims, and turns a blank value into null', () => {
    expect(cleanText('  Thorin ', 10)).toBe('Thorin')
    expect(cleanText('   ', 10)).toBeNull()
    expect(cleanText(null, 10)).toBeNull()
    expect(cleanText(undefined, 10)).toBeNull()
  })

  it('cuts at the limit without splitting an emoji', () => {
    expect(cleanText('abcdef', 3)).toBe('abc')
    expect(cleanText('ab😀cd', 3)).toBe('ab😀')
  })
})
