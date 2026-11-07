import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderApp } from '@/test/renderApp'

import { SCREENS } from './screens'

const EXPECTED_LABELS = [
  'Oyuncu elleri',
  'Pack Shop',
  'True Words',
  'Kart kütüphanesi',
  'Cursed Deck',
  'İşlem Logu',
  'Veri / Yedek',
]

const mainMenu = () => screen.getByRole('navigation', { name: 'Ana menü' })

describe('routes and navigation', () => {
  it('lists the seven screens in the legacy order', () => {
    renderApp({ path: '/hands' })

    const labels = within(mainMenu())
      .getAllByRole('link')
      .map((link) => link.textContent?.trim())
    expect(labels).toEqual(EXPECTED_LABELS.map((label, i) => `${SCREENS[i]?.icon}${label}`))
  })

  it('opens the "Oyuncu elleri" screen from the root URL', async () => {
    const { router } = renderApp({ path: '/' })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Oyuncu elleri' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/hands')
  })

  it.each(SCREENS.map((s) => [s.label, s.path] as const))(
    'navigates to %s and marks it as current',
    async (label, path) => {
      const user = userEvent.setup()
      const { router } = renderApp({ path: path === '/hands' ? '/shop' : '/hands' })

      await user.click(within(mainMenu()).getByRole('link', { name: label }))

      expect(router.state.location.pathname).toBe(path)
      expect(screen.getByRole('heading', { level: 1, name: label })).toBeInTheDocument()
      expect(screen.getByText('Bu ekran henüz hazır değil.')).toBeInTheDocument()
      expect(within(mainMenu()).getByRole('link', { name: label })).toHaveAttribute(
        'aria-current',
        'page',
      )
      const others = within(mainMenu())
        .getAllByRole('link')
        .filter((link) => link.getAttribute('aria-current') === 'page')
      expect(others).toHaveLength(1)
    },
  )

  it('shows each screen directly from its URL, as after a reload', () => {
    renderApp({ path: '/true-words' })

    expect(screen.getByRole('heading', { level: 1, name: 'True Words' })).toBeInTheDocument()
  })

  it('shows a not-found page with a link back to the default screen', async () => {
    const user = userEvent.setup()
    const { router } = renderApp({ path: '/does-not-exist' })

    expect(screen.getByRole('heading', { level: 1, name: 'Sayfa bulunamadı' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Oyuncu elleri ekranına dön' }))

    expect(router.state.location.pathname).toBe('/hands')
  })
})
