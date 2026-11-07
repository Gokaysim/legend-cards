import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

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

  it('shows the not-found page for the old Pack Shop address', () => {
    renderApp({ path: '/shop' })

    expect(screen.getByRole('heading', { level: 1, name: 'Sayfa bulunamadı' })).toBeInTheDocument()
  })
})
