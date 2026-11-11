import { describe, expect, it } from 'vitest'

import themeCss from './theme.css?raw'

/** Reads `--color-<name>: #rrggbb;` declarations from theme.css. */
function readColorTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>()
  for (const match of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    const [, name, value] = match
    if (name && value) tokens.set(name, value)
  }
  return tokens
}

/** WCAG 2.x relative luminance of a #rrggbb color. */
function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  ) as [number, number]
  return (lighter + 0.05) / (darker + 0.05)
}

const tokens = readColorTokens(themeCss)

function token(name: string): string {
  const value = tokens.get(name)
  if (!value) throw new Error(`Token --color-${name} is missing from theme.css`)
  return value
}

describe('theme tokens', () => {
  const textTokens = ['ink', 'ink-muted']
  const surfaces = ['canvas', 'sidebar', 'pane', 'pane-raised', 'control']

  for (const text of textTokens) {
    for (const surface of surfaces) {
      it(`${text} on ${surface} has at least 4.5:1 contrast`, () => {
        expect(contrastRatio(token(text), token(surface))).toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  it('on-primary text on the primary button has at least 4.5:1 contrast', () => {
    expect(contrastRatio(token('on-primary'), token('primary'))).toBeGreaterThanOrEqual(4.5)
  })

  it('gold accent on the sidebar has at least 4.5:1 contrast', () => {
    expect(contrastRatio(token('gold'), token('sidebar'))).toBeGreaterThanOrEqual(4.5)
  })

  // The Kurallar screen's section titles and bold runs sit on the canvas.
  it('gold text on the canvas has at least 4.5:1 contrast', () => {
    expect(contrastRatio(token('gold'), token('canvas'))).toBeGreaterThanOrEqual(4.5)
  })

  it('danger text on the sidebar has at least 4.5:1 contrast', () => {
    expect(contrastRatio(token('danger-ink'), token('sidebar'))).toBeGreaterThanOrEqual(4.5)
  })

  // A hand's cost on a card face: green when it is lower than the card's cost, red when it is higher.
  for (const accent of ['green', 'cursed']) {
    it(`${accent} cost text on the canvas has at least 4.5:1 contrast`, () => {
      expect(contrastRatio(token(accent), token('canvas'))).toBeGreaterThanOrEqual(4.5)
    })
  }

  // Card frames are non-text graphics: WCAG asks for at least 3:1 against the surface they sit on.
  for (const frame of ['common', 'gold', 'blessed', 'cursed']) {
    for (const surface of ['pane', 'pane-raised']) {
      it(`${frame} card frame on ${surface} has at least 3:1 contrast`, () => {
        expect(contrastRatio(token(frame), token(surface))).toBeGreaterThanOrEqual(3)
      })
    }
  }

  // The Cardmaker's speech bubble is a gradient from `bubble` to `bubble-deep`: every ink is read on both ends.
  for (const ink of ['bubble-title', 'bubble-ink', 'bubble-ink-muted']) {
    for (const surface of ['bubble', 'bubble-deep']) {
      it(`${ink} on ${surface} has at least 4.5:1 contrast`, () => {
        expect(contrastRatio(token(ink), token(surface))).toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  // The hand's stat tiles (design D7): the plain numbers are gold, and the Cursed and True Words tiles are gradients
  // whose label and number are read on both ends.
  it('gold numbers on a plain stat tile have at least 4.5:1 contrast', () => {
    expect(contrastRatio(token('gold'), token('pane-raised'))).toBeGreaterThanOrEqual(4.5)
  })

  const statTiles: [surfaces: string[], inks: string[]][] = [
    [
      ['stat-cursed', 'stat-cursed-deep'],
      ['stat-cursed-ink', 'cursed-soft'],
    ],
    [
      ['stat-word', 'stat-word-deep'],
      ['true-word', 'ink-muted'],
    ],
  ]
  for (const [surfaces, inks] of statTiles) {
    for (const ink of inks) {
      for (const surface of surfaces) {
        it(`${ink} on ${surface} has at least 4.5:1 contrast`, () => {
          expect(contrastRatio(token(ink), token(surface))).toBeGreaterThanOrEqual(4.5)
        })
      }
    }
  }

  it('keeps the Common frame purple apart from the True Words purples', () => {
    expect(token('common')).not.toBe(token('true-word'))
    expect(token('common')).not.toBe(token('true-word-line'))
  })
})
