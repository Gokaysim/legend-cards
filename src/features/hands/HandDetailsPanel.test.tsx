import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WIDE_WINDOW_QUERY } from '@/lib/useWideWindow'
import { testCard } from '@/test/cardFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { renderApp } from '@/test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
})

const ayla = testProfile({ id: 'ayla', displayName: 'Ayla' })
const dm = testProfile({ role: 'dm' })

const owl = testCard('Night Owl', { cost: '3' })
const oath = testCard('Old Oath', { cost: '1' })

/** A `matchMedia` stand-in for the wide-window query whose answer can change, with its listeners. */
function stubWindow(isWide: boolean) {
  const listeners = new Set<() => void>()
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return query === WIDE_WINDOW_QUERY && isWide
    },
    media: query,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }))
  return {
    resize(next: boolean) {
      isWide = next
      act(() => {
        for (const listener of listeners) listener()
      })
    },
  }
}

function renderHand({ path = '/hands/ayla', viewer = ayla } = {}) {
  return renderApp({
    path,
    users: { currentProfile: ready(viewer), profiles: ready([ayla, dm]) },
    cards: { cards: ready([owl, oath]) },
    holdings: {
      openHoldings: ready([
        testHolding(owl, 'ayla', 1000, { id: 'h-owl' }),
        testHolding(oath, 'ayla', 2000, { id: 'h-oath', active: true }),
      ]),
    },
  })
}

const panel = () => screen.getByRole('region', { name: 'Seçili Kart' })
/** The panel's own heading, which names the selected card. The face in the details has its own heading too. */
const panelName = () => within(panel()).getAllByRole('heading', { level: 3 })[0]
const face = (name: string) => screen.getByRole('button', { name: `${name}: ayrıntılar` })
/** A face's glow in the hand, from its glow box: around a face without a picture, or inside one with a picture. */
function glowOf(name: string) {
  const card = within(screen.getByRole('list', { name: 'Eldeki kartlar' })).getByRole('article', {
    name,
  })
  return (
    (card.closest('[data-glow]') ?? card.querySelector('[data-glow]'))?.getAttribute('data-glow') ??
    null
  )
}

describe('the "Seçili Kart" panel on a wide window', () => {
  it('stands beside the hand, asking to select a card', () => {
    stubWindow(true)
    renderHand()

    expect(within(panel()).getByText('Detayları görmek için elden bir kart seç.')).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it("shows a selected card's details under its name, without a dialog, and marks the card", async () => {
    stubWindow(true)
    const user = userEvent.setup()
    renderHand()

    await user.click(face('Night Owl'))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(panelName()).toHaveTextContent('Night Owl')
    expect(within(panel()).getByText(/^Ayla'nın elinde/)).toBeInTheDocument()
    expect(face('Night Owl')).toHaveAttribute('aria-current', 'true')
    expect(glowOf('Night Owl')).toBe('selected')
  })

  it('replaces the details when another card is selected', async () => {
    stubWindow(true)
    const user = userEvent.setup()
    renderHand()

    await user.click(face('Night Owl'))
    await user.click(face('Old Oath'))

    expect(panelName()).toHaveTextContent('Old Oath')
    expect(face('Old Oath')).toHaveAttribute('aria-current', 'true')
    expect(face('Night Owl')).not.toHaveAttribute('aria-current')
    expect(glowOf('Night Owl')).toBeNull()
    // An active card keeps its green glow when it is selected.
    expect(glowOf('Old Oath')).toBe('active')
  })

  it('marks the selected row in the list view', async () => {
    stubWindow(true)
    const user = userEvent.setup()
    renderHand()

    await user.click(screen.getByRole('button', { name: '☷ Liste' }))
    await user.click(screen.getByRole('button', { name: 'Old Oath' }))

    expect(screen.getByRole('button', { name: 'Old Oath' })).toHaveAttribute('aria-current', 'true')
    expect(panelName()).toHaveTextContent('Old Oath')
  })

  it('drops the selection when the window narrows, without opening a dialog', async () => {
    const media = stubWindow(true)
    const user = userEvent.setup()
    renderHand()
    await user.click(face('Night Owl'))

    media.resize(false)

    expect(screen.queryByRole('region', { name: 'Seçili Kart' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(face('Night Owl')).not.toHaveAttribute('aria-current')

    media.resize(true)
    expect(within(panel()).getByText('Detayları görmek için elden bir kart seç.')).toBeVisible()
  })

  it('is not shown on the DM notu tab', () => {
    stubWindow(true)
    renderHand({ path: '/hands/ayla?tab=dm-note', viewer: dm })

    expect(screen.queryByRole('region', { name: 'Seçili Kart' })).not.toBeInTheDocument()
  })
})

describe('the hand on a narrow window', () => {
  it('has no panel, and opens a selected card in a dialog', async () => {
    stubWindow(false)
    const user = userEvent.setup()
    renderHand()

    expect(screen.queryByRole('region', { name: 'Seçili Kart' })).not.toBeInTheDocument()
    await user.click(face('Night Owl'))

    expect(screen.getByRole('dialog', { name: 'Night Owl' })).toBeInTheDocument()
    expect(glowOf('Night Owl')).toBeNull()
  })
})
