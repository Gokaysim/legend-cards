import { type CSSProperties, useCallback, useState, useSyncExternalStore } from 'react'

export type DeckOptions = {
  /** The card's width when the row has room for it, in CSS pixels. */
  preferredWidth: number
  /** How much of a card the next one may cover, as a share of its width; 0 never overlaps. */
  maxOverlapRatio: number
  /** The gap between cards that do not overlap, in CSS pixels. */
  gap: number
}

export type DeckLayout = {
  cardWidth: number
  /** Cards per row. */
  columns: number
  /** Each card's offset from the one before it in its row: a gap when positive, an overlap when negative. */
  spacing: number
}

/**
 * How a deck of `count` cards lies in a row `width` pixels wide (spec: visual-effects, design D6). The cards are as
 * wide as `preferredWidth` allows, and as many fit into a row as possible: first with the gap between them, then, when
 * overlapping fits more of them, by covering up to `maxOverlapRatio` of each card, as v2.2.8 does.
 */
export function deckLayout(width: number, count: number, options: DeckOptions): DeckLayout {
  const cardWidth = Math.max(0, Math.min(options.preferredWidth, width))
  const most = Math.max(1, count)
  const fit = (columns: number) => Math.min(most, Math.max(1, Math.floor(columns)))
  if (cardWidth === 0) return { cardWidth, columns: 1, spacing: 0 }

  const withGap = fit((width + options.gap) / (cardWidth + options.gap))
  const maxOverlap = Math.round(cardWidth * options.maxOverlapRatio)
  const withOverlap =
    maxOverlap > 0 && maxOverlap < cardWidth
      ? fit((width - maxOverlap) / (cardWidth - maxOverlap))
      : 1
  if (withOverlap <= withGap) {
    return { cardWidth, columns: withGap, spacing: withGap > 1 ? options.gap : 0 }
  }
  // The row fills the width exactly: each card covers the same part of the one before it.
  const overlap = Math.min(
    maxOverlap,
    Math.max(0, (withOverlap * cardWidth - width) / (withOverlap - 1)),
  )
  return { cardWidth, columns: withOverlap, spacing: -overlap }
}

/**
 * A little less than the measured width: the cards' slight angles reach past their boxes, and a row that fills the
 * width to the last fraction of a pixel could wrap one card early.
 */
const WIDTH_MARGIN_PX = 4

const NO_HOVER = '(hover: none)'

function subscribeToHover(onChange: () => void): () => void {
  const query = typeof window.matchMedia === 'function' ? window.matchMedia(NO_HOVER) : null
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

/** True on a device without hover, such as a phone or a tablet, live. Where the browser cannot tell, it has hover. */
function useNoHover(): boolean {
  return useSyncExternalStore(
    subscribeToHover,
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(NO_HOVER).matches : false),
    () => false,
  )
}

export type Deck = {
  /** For the list: it is measured while it is on screen. */
  ref: (element: HTMLElement | null) => void
  /** For the list: the cards' width, as `--deck-card-width`, and the gap while it is not measured. */
  listStyle: CSSProperties
  /** For the card at `index`: its offset from the card before it, and its place in the stack, as `--deck-z`. */
  itemStyle: (index: number) => CSSProperties
}

/**
 * The deck layout of a measured list (design D6). On a device without hover, cards never overlap, so every card's
 * controls stay reachable. Before the list is measured, or without `ResizeObserver`, the cards wrap with the gap.
 */
export function useDeckLayout(count: number, options: DeckOptions): Deck {
  const [width, setWidth] = useState<number | null>(null)
  const noHover = useNoHover()

  const ref = useCallback((element: HTMLElement | null) => {
    if (element === null || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  if (width === null) {
    return {
      ref,
      listStyle: {
        '--deck-card-width': `${options.preferredWidth}px`,
        columnGap: options.gap,
      } as CSSProperties,
      itemStyle: () => ({}),
    }
  }
  const layout = deckLayout(Math.max(0, width - WIDTH_MARGIN_PX), count, {
    ...options,
    maxOverlapRatio: noHover ? 0 : options.maxOverlapRatio,
  })
  return {
    ref,
    listStyle: { '--deck-card-width': `${layout.cardWidth}px`, columnGap: 0 } as CSSProperties,
    itemStyle: (index) => {
      const column = index % layout.columns
      return {
        marginLeft: column === 0 ? 0 : layout.spacing,
        '--deck-z': column + 1,
      } as CSSProperties
    },
  }
}
