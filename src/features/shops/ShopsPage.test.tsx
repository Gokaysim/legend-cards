import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { testArt } from '@/test/artFixtures'
import { stubWideHover } from '@/test/media'
import { renderApp } from '@/test/renderApp'

const mainMenu = () => screen.getByRole('navigation', { name: 'Ana menü' })

/** The menu entries currently marked as the current page. */
const currentMenuLinks = () =>
  within(mainMenu())
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'page')

describe('Shops hub', () => {
  it('offers the two shops, each with its summary', () => {
    renderApp({ path: '/shops' })

    expect(screen.getByRole('heading', { level: 1, name: 'Shops' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pack Shop' })).toHaveAccessibleDescription(
      'Spesifik bir set veya mekanikten 5 kart gör, birini seç.',
    )
    expect(screen.getByRole('link', { name: 'Elixir Shop' })).toHaveAccessibleDescription(
      'Kartların kendilerini değiştirmeyi sağlayan etkiler.',
    )
    expect(screen.queryByText('Bu ekran henüz hazır değil.')).not.toBeInTheDocument()
  })

  it('opens the Pack Shop below the Shops address and keeps "Shops" marked', async () => {
    const user = userEvent.setup()
    const { router } = renderApp({ path: '/shops' })

    await user.click(screen.getByRole('link', { name: 'Pack Shop' }))

    expect(router.state.location.pathname).toBe('/shops/packs')
    expect(screen.getByRole('heading', { level: 1, name: 'Pack Shop' })).toBeInTheDocument()
    expect(screen.queryByText('Bu ekran henüz hazır değil.')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Set Packs' })).toBeInTheDocument()
    expect(currentMenuLinks()).toEqual([within(mainMenu()).getByRole('link', { name: 'Shops' })])
  })

  it('shows the unbuilt Elixir Shop with the not-ready note and a link back to Shops', () => {
    renderApp({ path: '/shops/elixirs' })

    expect(screen.getByRole('heading', { level: 1, name: 'Elixir Shop' })).toBeInTheDocument()
    expect(screen.getByText('Bu ekran henüz hazır değil.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Shops' })).toHaveAttribute('href', '/shops')
  })

  it('goes back to the Shops hub from a shop', async () => {
    const user = userEvent.setup()
    const { router } = renderApp({ path: '/shops/packs' })

    await user.click(screen.getByRole('link', { name: '← Shops' }))

    expect(router.state.location.pathname).toBe('/shops')
    expect(screen.getByRole('link', { name: 'Pack Shop' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Elixir Shop' })).toBeInTheDocument()
  })

  it('shows a shop directly from its URL, as after a reload, with "Shops" marked', () => {
    renderApp({ path: '/shops/elixirs' })

    expect(screen.getByRole('heading', { level: 1, name: 'Elixir Shop' })).toBeInTheDocument()
    expect(currentMenuLinks()).toEqual([within(mainMenu()).getByRole('link', { name: 'Shops' })])
  })

  it('does not list the shops as separate menu entries', () => {
    renderApp({ path: '/shops' })

    expect(within(mainMenu()).queryByRole('link', { name: 'Pack Shop' })).not.toBeInTheDocument()
    expect(within(mainMenu()).queryByRole('link', { name: 'Elixir Shop' })).not.toBeInTheDocument()
  })

  describe('its Cardmaker', () => {
    const SHOP = '/art/mascots/cardmaker_shop.0123456789.webp'
    const KEEP = '/art/mascots/cardmaker_keep.0123456789.webp'
    const titleMascot = () =>
      screen
        .getByRole('heading', { level: 1, name: 'Shops' })
        .closest('header')
        ?.querySelector('img[data-mascot]')
    const corner = () => document.querySelector('[data-corner-cardmaker]')

    afterEach(() => vi.unstubAllGlobals())

    it("shows the Pack Shop's Cardmaker by the title while cardmaker_keep has no picture", () => {
      renderApp({ path: '/shops', art: testArt({ mascots: { cardmaker_shop: SHOP } }) })

      expect(titleMascot()).toHaveAttribute('data-mascot', 'cardmaker_shop')
      expect(corner()).toBeNull()
    })

    it('shows cardmaker_keep once it has a picture', () => {
      renderApp({
        path: '/shops',
        art: testArt({ mascots: { cardmaker_shop: SHOP, cardmaker_keep: KEEP } }),
      })

      expect(titleMascot()).toHaveAttribute('data-mascot', 'cardmaker_keep')
    })

    it('stands her in the corner on a wide window with a mouse', () => {
      stubWideHover()
      renderApp({ path: '/shops', art: testArt({ mascots: { cardmaker_shop: SHOP } }) })

      expect(corner()).toHaveAttribute('data-corner-cardmaker', 'cardmaker_shop')
      expect(titleMascot()).toBeNull()
    })

    it("stands the Elixir Shop's Cardmaker in the corner too", () => {
      stubWideHover()
      renderApp({
        path: '/shops/elixirs',
        art: testArt({ mascots: { cardmaker_zaddir: '/art/mascots/cardmaker_zaddir.0123.webp' } }),
      })

      expect(corner()).toHaveAttribute('data-corner-cardmaker', 'cardmaker_zaddir')
      expect(
        screen.getByRole('heading', { level: 1, name: 'Elixir Shop' }).closest('header'),
      ).not.toContainHTML('data-mascot')
    })
  })

  describe("the Cardmaker's speech", () => {
    const ART = testArt({
      mascots: { cardmaker_shop: '/art/mascots/cardmaker_shop.0123456789.webp' },
    })
    const bubble = () => document.querySelector('[data-speech-bubble]')
    const summary = () =>
      screen.getByText('Spesifik bir set veya mekanikten 5 kart gör, birini seç.', {
        ignore: '[data-speech-bubble] *',
      })

    beforeEach(() => {
      vi.useFakeTimers()
      vi.stubGlobal('requestAnimationFrame', () => 0)
      vi.stubGlobal('cancelAnimationFrame', () => undefined)
    })

    afterEach(() => {
      vi.useRealTimers()
      vi.unstubAllGlobals()
    })

    it("speaks the Pack Shop's line, and keeps its description only for screen readers", () => {
      stubWideHover()
      renderApp({ path: '/shops', art: ART })

      fireEvent.pointerEnter(screen.getByRole('link', { name: 'Pack Shop' }).closest('li')!, {
        pointerType: 'mouse',
      })
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(bubble()).toHaveTextContent('Pack Shop')
      expect(bubble()).toHaveTextContent('Spesifik bir set veya mekanikten 5 kart gör, birini seç.')
      expect(bubble()).toHaveTextContent('Yavrum benim kartlar ne ara böyle karaborsaya düşmüş?')
      expect(summary()).toHaveClass('sr-only')
      expect(screen.getByRole('link', { name: 'Pack Shop' })).toHaveAccessibleDescription(
        'Spesifik bir set veya mekanikten 5 kart gör, birini seç.',
      )
    })

    it('shows the description in the tile on a phone or a narrow window', () => {
      renderApp({ path: '/shops', art: ART })

      expect(summary()).not.toHaveClass('sr-only')
    })

    it('shows the description in the tile where she has no picture to speak from', () => {
      stubWideHover()
      renderApp({ path: '/shops' })

      expect(document.querySelector('[data-corner-cardmaker]')).toBeNull()
      expect(summary()).not.toHaveClass('sr-only')
    })
  })

  it('shows the not-found page for the old Pack Shop address', () => {
    renderApp({ path: '/shop' })

    expect(screen.getByRole('heading', { level: 1, name: 'Sayfa bulunamadı' })).toBeInTheDocument()
  })
})
