import { describe, expect, it } from 'vitest'

import { characterSchema } from './schema'
import { readSheetUrl, sheetSiteName } from './sheetUrl'

/** The link a reading holds, or `undefined` when it holds none. */
function linkOf(text: string): string | undefined {
  const reading = readSheetUrl(text)
  return reading.kind === 'link' ? reading.url : undefined
}

describe('readSheetUrl', () => {
  it.each(['', '   ', '\t\n'])('reads %j as no link', (text) => {
    expect(readSheetUrl(text)).toEqual({ kind: 'none' })
  })

  it.each([
    ['docs.google.com/document/d/abc', 'https://docs.google.com/document/d/abc'],
    ['  HTTPS://Docs.Google.com/x  ', 'https://docs.google.com/x'],
    ['http://example.com', 'http://example.com/'],
    [
      'https://www.myth-weavers.com/sheet.html#id=1',
      'https://www.myth-weavers.com/sheet.html#id=1',
    ],
    ['localhost:5173/x', 'https://localhost:5173/x'],
    ['example.com:8080', 'https://example.com:8080/'],
    ['https://example.com/a b', 'https://example.com/a%20b'],
  ])('reads %j as %j', (text, url) => {
    expect(readSheetUrl(text)).toEqual({ kind: 'link', url })
  })

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'mailto:a@b.c',
    'ftp://x',
    'data:text/html,x',
    'http:/x',
  ])('reads %j as another start', (text) => {
    expect(readSheetUrl(text)).toEqual({ kind: 'wrong-start' })
  })

  it.each([
    ['a start alone', 'https://'],
    ['a space in the host', 'https://docs google.com'],
  ])('reads %s as not a link', (_case, text) => {
    expect(readSheetUrl(text)).toEqual({ kind: 'invalid' })
  })

  it('reads a link of 2048 characters, but not one that grows past 2048 once read', () => {
    const base = 'https://example.com/'
    expect(linkOf(`${base}${'x'.repeat(2048 - base.length)}`)).toHaveLength(2048)
    // 2048 characters as typed, but the space becomes "%20".
    const growing = `${base}${'x'.repeat(2048 - base.length - 2)} x`
    expect(growing).toHaveLength(2048)
    expect(readSheetUrl(growing)).toEqual({ kind: 'invalid' })
  })

  it.each([
    'docs.google.com/document/d/abc',
    '  HTTPS://Docs.Google.com/x  ',
    'https://example.com/a b',
    'https://example.com/ğüş',
    'localhost:5173/x',
  ])('makes %j a link the stored check accepts', (text) => {
    const sheetUrl = linkOf(text)
    expect(sheetUrl).toBeDefined()
    expect(characterSchema.shape.sheetUrl.safeParse(sheetUrl).success).toBe(true)
  })
})

describe('sheetSiteName', () => {
  it.each([
    ['https://docs.google.com/x', 'docs.google.com'],
    ['https://www.myth-weavers.com/sheet.html#id=1', 'myth-weavers.com'],
    ['http://localhost:5173/x', 'localhost'],
  ])('names the site of %j as %j', (url, name) => {
    expect(sheetSiteName(url)).toBe(name)
  })

  it('names nothing for an address it cannot read', () => {
    expect(sheetSiteName('https:// x')).toBeNull()
  })
})
