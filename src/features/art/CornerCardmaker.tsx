import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'

import { useArt } from './artContext'
import { type SpeechLine, useSpokenLine } from './cardmakerSpeech'
import { Mascot } from './Mascot'

/** v2.2.8's sizes (design D3): a shop's Cardmaker, and the Golden Packs' larger one. */
const SIZES = {
  shop: 'h-[min(440px,62vh)] w-[min(430px,39vw)]',
  gold: 'h-[min(620px,80vh)] w-[min(625px,62vw)]',
} as const

export type CornerCardmakerSize = keyof typeof SIZES

export type CornerCardmakerProps = {
  /** The Cardmaker picture's stem, for example `cardmaker_shop`. */
  stem: string
  size?: CornerCardmakerSize
}

const isInside = (rect: DOMRect, x: number, y: number) =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

const overlaps = (a: DOMRect, b: DOMRect) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

/**
 * The shops' Cardmaker, fixed in the window's bottom-right corner as in v2.2.8 (spec: card-images, design D3). A
 * screen shows it in place of the Cardmaker by its title while `useWideHover()` holds. She is decoration: she never
 * takes the pointer, so the tiles under her stay clickable. She fades out while the mouse pointer is over her box, or
 * while the keyboard focus is on something under her, so what she covers stays readable. Inside a
 * `<CardmakerSpeechProvider>`, her speech bubble opens at her left while a tile makes her speak. Without her picture,
 * nothing is shown.
 */
export function CornerCardmaker({ stem, size = 'shop' }: CornerCardmakerProps) {
  const hasPicture = useArt().mascotUrl(stem) !== null
  const line = useSpokenLine()
  const box = useRef<HTMLDivElement>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    if (!hasPicture) return
    let isScheduled = false
    let frame = 0
    let pointer: { x: number; y: number } | null = null

    // At most once per animation frame: is the pointer over her box, or the focused element under it?
    const hitTest = () => {
      isScheduled = false
      const element = box.current
      if (element === null) return
      const rect = element.getBoundingClientRect()
      const focused = document.activeElement
      const isPointerOver = pointer !== null && isInside(rect, pointer.x, pointer.y)
      const isFocusUnder =
        focused instanceof HTMLElement &&
        focused !== document.body &&
        !element.contains(focused) &&
        overlaps(rect, focused.getBoundingClientRect())
      setIsDismissed(isPointerOver || isFocusUnder)
    }
    const schedule = () => {
      if (isScheduled) return
      isScheduled = true
      frame = requestAnimationFrame(hitTest)
    }
    const onPointerMove = (event: PointerEvent) => {
      // A touch never fades her: she stands in the corner only on devices with hover.
      if (event.pointerType === 'touch') return
      pointer = { x: event.clientX, y: event.clientY }
      schedule()
    }
    const onPointerLeave = () => {
      pointer = null
      schedule()
    }

    const root = document.documentElement
    document.addEventListener('pointermove', onPointerMove, { passive: true })
    root.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('focusin', schedule)
    document.addEventListener('focusout', schedule)
    // Scrolling moves the focused element under or out from under her.
    document.addEventListener('scroll', schedule, { capture: true, passive: true })
    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      root.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('focusin', schedule)
      document.removeEventListener('focusout', schedule)
      document.removeEventListener('scroll', schedule, { capture: true })
      if (isScheduled) cancelAnimationFrame(frame)
    }
  }, [hasPicture])

  if (!hasPicture) return null
  return (
    <>
      <div
        ref={box}
        aria-hidden="true"
        data-corner-cardmaker={stem}
        data-size={size}
        data-dismissed={isDismissed ? '' : undefined}
        className={cn(
          'pointer-events-none fixed right-4.5 bottom-3 z-20 flex items-end justify-end transition-opacity motion-reduce:transition-none',
          SIZES[size],
          isDismissed ? 'opacity-0 duration-170 ease-out' : 'opacity-100 duration-320 ease-in',
        )}
      >
        <Mascot stem={stem} className="h-full w-full object-right-bottom" />
      </div>
      {line === null ? null : <SpeechBubble key={line.title} line={line} />}
    </>
  )
}

/**
 * Her speech bubble, at her left near the bottom of the window (spec: cardmaker-speech, design D5): v2.2.8's cream
 * paper with its tail pointing at her. It never takes the pointer, so a click under it reaches the tile. Screen readers
 * skip it: what it holds is also the shop's description and in the pack's confirmation, and her line is flavor. It
 * stands next to the `shop`-sized corner, since no screen with the Golden Packs' larger one has a speaking tile, and
 * its width keeps it clear of the 16rem sidebar.
 */
function SpeechBubble({ line }: { line: SpeechLine }) {
  return (
    <div
      aria-hidden="true"
      data-speech-bubble
      className="pointer-events-none speech-bubble-tail fixed right-[calc(18px_+_min(430px,39vw)_+_20px)] bottom-9.5 z-20 w-[min(470px,calc(100vw_-_16rem_-_min(430px,39vw)_-_4.5rem))] rounded-[18px] border-2 border-bubble-line bg-linear-160 from-bubble to-bubble-deep px-4.25 pt-3.5 pb-3.75 text-bubble-ink shadow-2xl motion-safe:animate-bubble-in"
    >
      <p className="mb-1.5 text-sm font-extrabold text-bubble-title">{line.title}</p>
      <p className="mb-2 text-[13px] leading-normal font-extrabold text-bubble-ink">
        {line.summary}
      </p>
      <p className="text-xs leading-[1.45] whitespace-pre-wrap text-bubble-ink-muted">
        {line.speech}
      </p>
    </div>
  )
}
