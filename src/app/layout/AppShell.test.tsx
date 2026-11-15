import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ready, testProfile, testUser } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'

afterEach(() => {
  vi.restoreAllMocks()
})

function setNetwork(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'))
  })
}

/** The desktop sidebar (the mobile menu renders the same content only while it is open). */
const userSidebar = () => screen.getByRole('complementary')

/** The signed-in user's badge in the desktop sidebar. */
const userBadge = () => screen.getByRole('region', { name: 'Giriş yapan kullanıcı' })

describe('AppShell', () => {
  it('shows the app name and the running version', () => {
    renderApp({ path: '/hands' })

    expect(screen.getAllByText('✦ Legend Cards').length).toBeGreaterThan(0)
    expect(screen.getByText(`v${__APP_VERSION__}`)).toBeInTheDocument()
  })

  it('shows the signed-in user with their picture', () => {
    const photoURL = 'https://example.com/avatar.png'
    const { container } = renderApp({
      path: '/hands',
      state: { status: 'signedIn', user: { ...testUser, photoURL } },
    })

    expect(within(userBadge()).getByText('Gökay')).toBeInTheDocument()
    expect(container.querySelector(`img[src="${photoURL}"]`)).not.toBeNull()
  })

  it('shows an initial instead of a picture when the account has none', () => {
    renderApp({ path: '/hands' })

    expect(within(userBadge()).getByText('Gökay')).toBeInTheDocument()
    expect(userBadge().querySelector('img')).toBeNull()
    expect(within(userBadge()).getByText('G')).toBeInTheDocument()
  })

  it('shows "Oyuncu" for a player and "DM" for the DM', () => {
    const { setUsers } = renderApp({ path: '/hands' })
    expect(within(userBadge()).getByText('Oyuncu')).toBeInTheDocument()

    setUsers({ currentProfile: ready(testProfile({ role: 'dm' })) })

    expect(within(userBadge()).getByText('DM')).toBeInTheDocument()
    expect(within(userBadge()).queryByText('Oyuncu')).not.toBeInTheDocument()
  })

  it('switches from "Oyuncu" to "DM" in place when the role changes, without remounting', () => {
    const { setUsers } = renderApp({ path: '/hands' })
    const badge = userBadge()

    setUsers({ currentProfile: ready(testProfile({ role: 'dm' })) })

    expect(userBadge()).toBe(badge)
    expect(within(badge).getByText('DM')).toBeInTheDocument()
  })

  it('shows no role while the profile loads, and "Oyuncu" before the profile exists', () => {
    const { setUsers } = renderApp({
      path: '/hands',
      users: { currentProfile: { status: 'loading' } },
    })
    expect(within(userBadge()).queryByText('Oyuncu')).not.toBeInTheDocument()
    expect(within(userBadge()).queryByText('DM')).not.toBeInTheDocument()

    setUsers({ currentProfile: ready(null) })

    expect(within(userBadge()).getByText('Oyuncu')).toBeInTheDocument()
  })

  it('signs out from the sidebar', async () => {
    const user = userEvent.setup()
    const signOut = vi.fn(() => Promise.resolve())
    renderApp({ path: '/hands', signOut })

    await user.click(screen.getByRole('button', { name: 'Çıkış yap' }))

    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it('opens the mobile menu and closes it after choosing a screen', async () => {
    const user = userEvent.setup()
    const { router } = renderApp({ path: '/hands' })
    const menuButton = screen.getByRole('button', { name: '☰ Menü' })
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')

    await user.click(menuButton)
    const drawer = screen.getByRole('dialog', { name: 'Menü' })
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')

    await user.click(within(drawer).getByRole('link', { name: 'Kütüphane' }))

    expect(router.state.location.pathname).toBe('/library')
    expect(screen.queryByRole('dialog', { name: 'Menü' })).not.toBeInTheDocument()
  })

  it('opens a player\'s hand from the "Oyuncular" list and marks that player', async () => {
    const user = userEvent.setup()
    const { router } = renderApp({
      path: '/library',
      users: { profiles: ready([testProfile(), testProfile({ id: 'bora', displayName: 'Bora' })]) },
    })
    const players = within(userSidebar()).getByRole('region', { name: 'Oyuncular' })

    await user.click(within(players).getByRole('link', { name: 'Bora' }))

    expect(router.state.location.pathname).toBe('/hands/bora')
    expect(screen.getByRole('heading', { level: 2, name: 'Bora — Kart Eli' })).toBeInTheDocument()
    expect(within(players).getByRole('link', { name: 'Bora' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(players).getByRole('link', { name: 'Gökay' })).not.toHaveAttribute('aria-current')
  })

  it("closes the mobile menu after opening a player's hand from it", async () => {
    const user = userEvent.setup()
    const { router } = renderApp({
      path: '/library',
      users: { profiles: ready([testProfile(), testProfile({ id: 'bora', displayName: 'Bora' })]) },
    })

    await user.click(screen.getByRole('button', { name: '☰ Menü' }))
    const drawer = screen.getByRole('dialog', { name: 'Menü' })
    await user.click(within(drawer).getByRole('link', { name: 'Bora' }))

    expect(router.state.location.pathname).toBe('/hands/bora')
    expect(screen.queryByRole('dialog', { name: 'Menü' })).not.toBeInTheDocument()
  })

  it('closes the mobile menu with Escape or the backdrop', async () => {
    const user = userEvent.setup()
    renderApp({ path: '/hands' })

    await user.click(screen.getByRole('button', { name: '☰ Menü' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Menü' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '☰ Menü' }))
    await user.click(screen.getByRole('button', { name: 'Menüyü kapat' }))
    expect(screen.queryByRole('dialog', { name: 'Menü' })).not.toBeInTheDocument()
  })

  it('shows the offline banner while offline and hides it when back online', () => {
    renderApp({ path: '/hands' })
    const bannerText = 'Çevrimdışısın — değişiklikler bağlantı gelince eşitlenecek.'
    expect(screen.queryByText(bannerText)).not.toBeInTheDocument()

    setNetwork(false)
    expect(screen.getByText(bannerText)).toBeInTheDocument()

    setNetwork(true)
    expect(screen.queryByText(bannerText)).not.toBeInTheDocument()
  })
})
