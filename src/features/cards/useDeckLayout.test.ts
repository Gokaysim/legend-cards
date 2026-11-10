import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { deckLayout, useDeckLayout } from './useDeckLayout'

const HAND = { preferredWidth: 235, maxOverlapRatio: 0.36, gap: 12 }
const LIBRARY = { preferredWidth: 235, maxOverlapRatio: 0.39, gap: 12 }

/** The width a row of the layout takes. */
const rowWidth = ({ cardWidth, columns, spacing }: ReturnType<typeof deckLayout>) =>
  columns * cardWidth + (columns - 1) * spacing

describe('deckLayout', () => {
  it('gives a phone one card per row, as wide as the row allows, without overlap', () => {
    expect(deckLayout(360, 9, HAND)).toEqual({ cardWidth: 235, columns: 1, spacing: 0 })
    expect(deckLayout(200, 9, HAND)).toEqual({ cardWidth: 200, columns: 1, spacing: 0 })
  })

  it.each([
    ['the hand at 768 px', 768, HAND, 4],
    ['the library at 768 px', 768, LIBRARY, 4],
    ['the hand at 1280 px', 1280, HAND, 7],
    ['the library at 1280 px', 1280, LIBRARY, 8],
  ])(
    'overlaps %s to fit more cards, within the largest overlap',
    (_case, width, options, columns) => {
      const layout = deckLayout(width, 20, options)

      expect(layout.cardWidth).toBe(235)
      expect(layout.columns).toBe(columns)
      expect(layout.spacing).toBeLessThan(0)
      expect(-layout.spacing).toBeLessThanOrEqual(Math.round(235 * options.maxOverlapRatio))
      expect(rowWidth(layout)).toBeCloseTo(width)
    },
  )

  it('never overlaps without an overlap ratio: the cards keep the gap', () => {
    expect(deckLayout(768, 20, { ...HAND, maxOverlapRatio: 0 })).toEqual({
      cardWidth: 235,
      columns: 3,
      spacing: 12,
    })
  })

  it('keeps the gap when fewer cards than fit are shown', () => {
    expect(deckLayout(1280, 2, HAND)).toEqual({ cardWidth: 235, columns: 2, spacing: 12 })
    expect(deckLayout(1280, 1, HAND)).toEqual({ cardWidth: 235, columns: 1, spacing: 0 })
    expect(deckLayout(1280, 0, HAND)).toEqual({ cardWidth: 235, columns: 1, spacing: 0 })
  })

  it('always fits a row into the width, for any width and number of cards', () => {
    for (const options of [HAND, LIBRARY, { ...HAND, maxOverlapRatio: 0 }]) {
      for (let width = 120; width <= 1700; width += 37) {
        for (let count = 1; count <= 20; count += 1) {
          const layout = deckLayout(width, count, options)
          expect(layout.columns).toBeGreaterThanOrEqual(1)
          expect(layout.columns).toBeLessThanOrEqual(count)
          expect(rowWidth(layout)).toBeLessThanOrEqual(width + 1e-9)
          expect(-layout.spacing).toBeLessThanOrEqual(
            Math.round(layout.cardWidth * options.maxOverlapRatio),
          )
        }
      }
    }
  })
})

describe('useDeckLayout', () => {
  /** A `ResizeObserver` that reports `width` once, as soon as it observes. */
  const stubResize = (width: number) =>
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private readonly callback: ResizeObserverCallback
        constructor(callback: ResizeObserverCallback) {
          this.callback = callback
        }
        observe() {
          this.callback(
            [{ contentRect: { width } } as ResizeObserverEntry],
            this as unknown as ResizeObserver,
          )
        }
        disconnect() {}
      },
    )
  const stubHover = (noHover: boolean) =>
    vi.stubGlobal('matchMedia', () => ({
      matches: noHover,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }))

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('wraps the cards with the gap until the list is measured', () => {
    const { result } = renderHook(() => useDeckLayout(9, HAND))

    expect(result.current.listStyle).toMatchObject({ '--deck-card-width': '235px', columnGap: 12 })
    expect(result.current.itemStyle(1)).toEqual({})
  })

  it('overlaps the cards of a measured list, with no offset at the start of a row', () => {
    stubResize(1284)
    stubHover(false)
    const { result } = renderHook(() => useDeckLayout(9, HAND))

    act(() => result.current.ref(document.createElement('ol')))

    expect(result.current.listStyle).toMatchObject({ '--deck-card-width': '235px', columnGap: 0 })
    // 7 cards fit into a row of 1280 px.
    expect(result.current.itemStyle(0)).toMatchObject({ marginLeft: 0, '--deck-z': 1 })
    expect(result.current.itemStyle(1).marginLeft).toBeLessThan(0)
    expect(result.current.itemStyle(6)).toMatchObject({ '--deck-z': 7 })
    expect(result.current.itemStyle(7)).toMatchObject({ marginLeft: 0, '--deck-z': 1 })
  })

  it('never overlaps on a device without hover', () => {
    stubResize(1284)
    stubHover(true)
    const { result } = renderHook(() => useDeckLayout(9, HAND))

    act(() => result.current.ref(document.createElement('ol')))

    expect(result.current.itemStyle(1)).toMatchObject({ marginLeft: 12 })
    // 5 cards fit with the gap.
    expect(result.current.itemStyle(5)).toMatchObject({ marginLeft: 0 })
  })
})
