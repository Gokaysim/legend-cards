import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { testArt } from '@/test/artFixtures'
import { testCard } from '@/test/cardFixtures'
import { TestArtProvider } from '@/test/TestArtProvider'

import { CardFace } from './CardFace'

const OWL = testCard('Night Owl')
const ART = testArt({ cards: { [OWL.id]: '/art/cards/legend-nightowl.0123456789.webp' } })

const stubMotion = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', () => ({
    matches: reduce,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))

const face = () => screen.getByRole('article', { name: 'Night Owl' })

/** The box that tilts: the CSS face itself, or the picture's box inside the face. */
const tiltBox = () => {
  const card = face()
  return card.classList.contains('card-tilt') ? card : card.querySelector<HTMLElement>('.card-tilt')
}

describe('the card tilt', () => {
  beforeEach(() => {
    stubMotion(false)
    // One frame runs at once; every box is 100 by 140 pixels at the page's top-left corner.
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => undefined)
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 100, height: 140 }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('tilts a CSS face toward a mouse pointer, with the glint under it', () => {
    render(<CardFace card={OWL} isTiltable />)

    // Near the top-right corner: the top comes toward the viewer, and the right side too.
    fireEvent.pointerMove(face(), { pointerType: 'mouse', clientX: 90, clientY: 14 })

    const box = tiltBox()
    expect(box).toBe(face())
    expect(box).toHaveAttribute('data-tilt')
    expect(box?.style.getPropertyValue('--tilt-x')).toBe('2.16deg')
    expect(box?.style.getPropertyValue('--tilt-y')).toBe('2.16deg')
    expect(box?.style.getPropertyValue('--push-x')).toBe('2.80px')
    expect(box?.style.getPropertyValue('--push-y')).toBe('-2.80px')
    expect(box?.style.getPropertyValue('--glint-x')).toBe('90.0%')
    expect(box?.style.getPropertyValue('--glint-y')).toBe('10.0%')
  })

  it("tilts a picture's box, also under the whole-face control on top of it", () => {
    render(
      <TestArtProvider manifest={ART}>
        <CardFace card={OWL} handCost="1" isTiltable onOpen={() => undefined} openLabel="Aç" />
      </TestArtProvider>,
    )

    fireEvent.pointerMove(within(face()).getByRole('button', { name: 'Aç' }), {
      pointerType: 'mouse',
      clientX: 10,
      clientY: 126,
    })

    const box = tiltBox()
    expect(box).not.toBe(face())
    expect(box).toContainElement(within(face()).getByRole('img', { name: 'Night Owl' }))
    expect(box).toHaveAttribute('data-tilt')
    expect(box?.style.getPropertyValue('--tilt-x')).toBe('-2.16deg')
    expect(box?.style.getPropertyValue('--tilt-y')).toBe('-2.16deg')
  })

  it('settles flat when the pointer leaves', () => {
    render(<CardFace card={OWL} isTiltable />)
    fireEvent.pointerMove(face(), { pointerType: 'mouse', clientX: 90, clientY: 14 })

    fireEvent.pointerLeave(face(), { pointerType: 'mouse' })

    expect(face()).not.toHaveAttribute('data-tilt')
    expect(face().style.getPropertyValue('--tilt-x')).toBe('')
    expect(face().style.getPropertyValue('--glint-x')).toBe('')
  })

  it('stays flat under a touch, and a touch flattens a tilted card', () => {
    render(<CardFace card={OWL} isTiltable />)

    fireEvent.pointerMove(face(), { pointerType: 'touch', clientX: 90, clientY: 14 })
    expect(face()).not.toHaveAttribute('data-tilt')

    fireEvent.pointerMove(face(), { pointerType: 'mouse', clientX: 90, clientY: 14 })
    fireEvent.pointerDown(face(), { pointerType: 'touch' })
    expect(face()).not.toHaveAttribute('data-tilt')
  })

  it('stays flat under a pen pressed on the screen, and tilts under a hovering pen', () => {
    render(<CardFace card={OWL} isTiltable />)

    fireEvent.pointerMove(face(), { pointerType: 'pen', buttons: 1, clientX: 90, clientY: 14 })
    expect(face()).not.toHaveAttribute('data-tilt')

    fireEvent.pointerMove(face(), { pointerType: 'pen', buttons: 0, clientX: 90, clientY: 14 })
    expect(face()).toHaveAttribute('data-tilt')
  })

  it('keeps the tilt through a mouse press', () => {
    render(<CardFace card={OWL} isTiltable />)
    fireEvent.pointerMove(face(), { pointerType: 'mouse', clientX: 90, clientY: 14 })

    fireEvent.pointerDown(face(), { pointerType: 'mouse' })

    expect(face()).toHaveAttribute('data-tilt')
  })

  it('stays flat when the device asks for reduced motion', () => {
    stubMotion(true)
    render(<CardFace card={OWL} isTiltable />)

    fireEvent.pointerMove(face(), { pointerType: 'mouse', clientX: 90, clientY: 14 })

    expect(face()).not.toHaveAttribute('data-tilt')
  })

  it('leaves a face without isTiltable still, as inside a dialog', () => {
    render(
      <TestArtProvider manifest={ART}>
        <CardFace card={OWL} />
      </TestArtProvider>,
    )

    fireEvent.pointerMove(face(), { pointerType: 'mouse', clientX: 90, clientY: 14 })

    expect(tiltBox()).toBeNull()
    expect(face().querySelector('[data-tilt]')).toBeNull()
  })
})
