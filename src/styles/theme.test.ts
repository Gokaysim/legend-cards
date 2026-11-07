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
})
