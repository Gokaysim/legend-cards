import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { testArt } from '@/test/artFixtures'
import { TestArtProvider } from '@/test/TestArtProvider'

import { CardmakerSpeechContext, type SpeechLine } from './cardmakerSpeech'
import { CornerCardmaker } from './CornerCardmaker'

const ART = testArt({
  mascots: {
    cardmaker_shop: '/art/mascots/cardmaker_shop.0123456789.webp',
    cardmaker_gold: '/art/mascots/cardmaker_gold.0123456789.webp',
  },
})

/** Her box: 400 by 400 pixels in the bottom-right of a 1280 by 800 window. */
const CORNER = DOMRect.fromRect({ x: 862, y: 388, width: 400, height: 400 })
/** Anything else: a 100 by 100 box in the top-left corner, clear of hers. */
const ELSEWHERE = DOMRect.fromRect({ x: 0, y: 0, width: 100, height: 100 })

function renderCorner(ui = <CornerCardmaker stem="cardmaker_shop" />, art = ART) {
  return render(<TestArtProvider manifest={art}>{ui}</TestArtProvider>)
}

const corner = () => document.querySelector<HTMLElement>('[data-corner-cardmaker]')

describe('CornerCardmaker', () => {
  beforeEach(() => {
    // One frame runs at once. Her box is in the corner; every other element is elsewhere, unless a test says so.
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => undefined)
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      return this.hasAttribute('data-corner-cardmaker') || this.hasAttribute('data-under')
        ? CORNER
        : ELSEWHERE
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('stands fixed in the corner as decoration that never takes the pointer', () => {
    renderCorner()

    expect(corner()).toHaveAttribute('data-corner-cardmaker', 'cardmaker_shop')
    expect(corner()).toHaveAttribute('aria-hidden', 'true')
    expect(corner()).toHaveClass('pointer-events-none', 'fixed', 'right-4.5', 'bottom-3')
    expect(corner()).toHaveAttribute('data-size', 'shop')
    expect(corner()).toHaveClass('w-[min(430px,39vw)]')
    expect(corner()?.querySelector('img')).toHaveAttribute(
      'src',
      '/art/mascots/cardmaker_shop.0123456789.webp',
    )
    expect(corner()).not.toHaveAttribute('data-dismissed')
  })

  it("is larger for the Golden Packs' Cardmaker", () => {
    renderCorner(<CornerCardmaker stem="cardmaker_gold" size="gold" />)

    expect(corner()).toHaveAttribute('data-size', 'gold')
    expect(corner()).toHaveClass('w-[min(625px,62vw)]')
  })

  it('fades out while the mouse pointer is over her, and comes back when it leaves', () => {
    renderCorner()

    fireEvent.pointerMove(document, { pointerType: 'mouse', clientX: 1000, clientY: 600 })
    expect(corner()).toHaveAttribute('data-dismissed')
    expect(corner()).toHaveClass('opacity-0')

    fireEvent.pointerMove(document, { pointerType: 'mouse', clientX: 300, clientY: 200 })
    expect(corner()).not.toHaveAttribute('data-dismissed')
    expect(corner()).toHaveClass('opacity-100')
  })

  it('does not fade for a touch', () => {
    renderCorner()

    fireEvent.pointerMove(document, { pointerType: 'touch', clientX: 1000, clientY: 600 })
    expect(corner()).not.toHaveAttribute('data-dismissed')
  })

  it('fades out while the keyboard focus is on something under her', () => {
    renderCorner(
      <>
        <button type="button" data-under>
          Under her
        </button>
        <button type="button">Elsewhere</button>
        <CornerCardmaker stem="cardmaker_shop" />
      </>,
    )
    const [under, elsewhere] = document.querySelectorAll('button')

    act(() => under?.focus())
    expect(corner()).toHaveAttribute('data-dismissed')

    act(() => elsewhere?.focus())
    expect(corner()).not.toHaveAttribute('data-dismissed')
  })

  it('stops listening when she goes', () => {
    const { unmount } = renderCorner()
    const removed = vi.spyOn(document, 'removeEventListener')

    unmount()

    expect(removed.mock.calls.map(([type]) => type)).toEqual(
      expect.arrayContaining(['pointermove', 'focusin', 'focusout', 'scroll']),
    )
  })

  describe('her speech bubble', () => {
    const LINE: SpeechLine = {
      title: 'Blood & Battle Mechanic Pack',
      summary: 'Combat etkileri, saldırı ve hasar zarlarıyla ilgili kartları içerir.',
      speech: 'Aman dikkat et kendine evladım.\nSonra ağlarsın.',
    }
    const speaking = (spoken: SpeechLine | null) => (
      <CardmakerSpeechContext
        value={{ isEnabled: true, spoken, begin: () => undefined, end: () => undefined }}
      >
        <CornerCardmaker stem="cardmaker_shop" />
      </CardmakerSpeechContext>
    )
    const bubble = () => document.querySelector<HTMLElement>('[data-speech-bubble]')

    it("shows the line's title, what it holds and her words at her left", () => {
      renderCorner(speaking(LINE))

      const paragraphs = [...(bubble()?.querySelectorAll('p') ?? [])]
      expect(paragraphs.map((p) => p.textContent)).toEqual([
        'Blood & Battle Mechanic Pack',
        'Combat etkileri, saldırı ve hasar zarlarıyla ilgili kartları içerir.',
        'Aman dikkat et kendine evladım.\nSonra ağlarsın.',
      ])
      expect(paragraphs[2]).toHaveClass('whitespace-pre-wrap')
      expect(bubble()).toHaveClass('fixed', 'speech-bubble-tail', 'motion-safe:animate-bubble-in')
    })

    it('never takes the pointer, and screen readers skip it', () => {
      renderCorner(speaking(LINE))

      expect(bubble()).toHaveClass('pointer-events-none')
      expect(bubble()).toHaveAttribute('aria-hidden', 'true')
    })

    it('is not there while she says nothing', () => {
      renderCorner(speaking(null))

      expect(corner()).not.toBeNull()
      expect(bubble()).toBeNull()
    })

    it('is not there without her picture', () => {
      renderCorner(speaking(LINE), testArt({}))

      expect(bubble()).toBeNull()
    })
  })

  it('shows nothing without her picture', () => {
    renderCorner(<CornerCardmaker stem="cardmaker_keep" />)

    expect(corner()).toBeNull()
  })
})
