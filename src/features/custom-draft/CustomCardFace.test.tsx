import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CardFace } from '@/features/cards/CardFace'
import { CardZoomDialog } from '@/features/cards/CardZoomDialog'
import { testArt } from '@/test/artFixtures'
import { testCustomCard, testEffect } from '@/test/cardFixtures'
import { stubMedia } from '@/test/media'
import { renderWithSets } from '@/test/renderWithSets'
import { TestArtProvider } from '@/test/TestArtProvider'

import { PREVIEW_STEP_MS } from './CustomEffectsPreview'

// The Custom Card's face and zoom view (spec: custom-cards, "The Custom Card's face"; design D9 of
// add-custom-card-draft), as CardFace and CardZoomDialog draw them.

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const ART = testArt({
  customCovers: { '3': '/art/custom/3.0123456789.webp' },
  customEffects: {
    '3:Caster': '/art/custom/3-caster.0123456789.webp',
    '3:Draw': '/art/custom/3-draw.0123456789.webp',
    '3:Gold': '/art/custom/3-gold.0123456789.webp',
  },
})

const card = testCustomCard('custom-1')

function renderFace(manifest = ART, handCost: string | null = '3') {
  return renderWithSets(
    <TestArtProvider manifest={manifest}>
      <CardFace card={card} handCost={handCost} />
    </TestArtProvider>,
  )
}

const face = () => screen.getByRole('article', { name: '3-Cost Custom Card' })
const preview = () => face().querySelector('[data-custom-preview]')
const previewEffects = () =>
  [...(preview()?.querySelectorAll('[data-effect]') ?? [])].map((item) =>
    item.getAttribute('data-effect'),
  )

describe("a Custom Card's face", () => {
  it('shows the cover of its draft cost with its hand cost badge, and its effects for screen readers', () => {
    renderFace(ART, '2')
    expect(face().querySelector('img')).toHaveAttribute('src', '/art/custom/3.0123456789.webp')
    expect(face()).toHaveTextContent('Cost: 2')
    expect(face()).toHaveTextContent('Caster (3-Cost): Invented Caster effect at 3-cost.')
    expect(face()).toHaveAttribute('data-frame', 'custom')
  })

  it('shows its name, cost and effects as text without a cover', () => {
    renderFace(testArt({}))
    expect(face().querySelector('img')).toBeNull()
    expect(within(face()).getByRole('heading', { name: '3-Cost Custom Card' })).toBeInTheDocument()
    expect(face()).toHaveTextContent('Cost: 3')
    expect(face()).toHaveTextContent('Caster (3-Cost) Draw (3-Cost) Gold (3-Cost)')
  })

  it('cycles through its effect pictures while hovered, on a device with hover', async () => {
    stubMedia('(hover: hover)')
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderFace()
    expect(preview()).toBeNull()

    await user.hover(face())
    expect(preview()).toHaveAttribute('data-custom-preview', 'cycling')
    expect(previewEffects()).toEqual(['3:Caster'])
    act(() => {
      vi.advanceTimersByTime(PREVIEW_STEP_MS)
    })
    expect(previewEffects()).toEqual(['3:Draw'])
    act(() => {
      vi.advanceTimersByTime(PREVIEW_STEP_MS)
    })
    expect(previewEffects()).toEqual(['3:Gold'])

    await user.unhover(face())
    expect(preview()).toBeNull()
  })

  it('shows the effect pictures side by side with reduced motion', async () => {
    stubMedia('(hover: hover)', '(prefers-reduced-motion: reduce)')
    const user = userEvent.setup()
    renderFace()
    await user.hover(face())
    expect(preview()).toHaveAttribute('data-custom-preview', 'side-by-side')
    expect(previewEffects()).toEqual(['3:Caster', '3:Draw', '3:Gold'])
  })

  it('shows no preview on a device without hover', async () => {
    stubMedia('(hover: none)')
    const user = userEvent.setup()
    renderFace()
    await user.hover(face())
    expect(preview()).toBeNull()
  })
})

describe("a Custom Card's zoom view", () => {
  it('shows the cover with the effect pictures beside it', () => {
    renderWithSets(
      <TestArtProvider manifest={ART}>
        <CardZoomDialog
          card={{ ...card, effects: [...card.effects, testEffect('Held', 1)] }}
          handCost="3"
          onClose={() => undefined}
        />
      </TestArtProvider>,
    )
    const dialog = within(screen.getByRole('dialog', { name: '3-Cost Custom Card' }))
    expect(dialog.getByRole('img', { name: '3-Cost Custom Card' })).toHaveAttribute(
      'src',
      '/art/custom/3.0123456789.webp',
    )
    const effects = within(dialog.getByRole('list', { name: 'Efektler' }))
    expect(effects.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Caster · 3-Cost',
      'Draw · 3-Cost',
      'Gold · 3-Cost',
      // No picture of Held at 1-cost: its type and cost as text.
      'Held1-CostHeld · 1-Cost',
    ])
  })

  it('shows the face without pictures when there is no cover', () => {
    renderWithSets(
      <TestArtProvider manifest={testArt({})}>
        <CardZoomDialog card={card} handCost="3" onClose={() => undefined} />
      </TestArtProvider>,
    )
    const dialog = within(screen.getByRole('dialog', { name: '3-Cost Custom Card' }))
    expect(dialog.queryByRole('list', { name: 'Efektler' })).not.toBeInTheDocument()
    expect(dialog.getByRole('article', { name: '3-Cost Custom Card' })).toHaveTextContent(
      'Caster (3-Cost)',
    )
  })
})
