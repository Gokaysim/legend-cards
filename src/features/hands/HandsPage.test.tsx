import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ready, testProfile, testUser } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'

const me = testProfile()
const ayla = testProfile({ id: 'ayla', displayName: 'Ayla' })
const bora = testProfile({ id: 'bora', displayName: 'Bora' })
const dmProfile = testProfile({ role: 'dm' })

const heading = () => screen.getByRole('heading', { level: 1 })
/** The screen itself, without the sidebar (its "Oyuncular" list has its own loading and error states). */
const main = () => within(screen.getByRole('main'))

describe('the "Oyuncu elleri" entry', () => {
  it("opens a player's own hand, titled with their name", () => {
    const { router } = renderApp({
      path: '/hands',
      users: { profiles: ready([ayla, bora, me]) },
    })

    expect(router.state.location.pathname).toBe(`/hands/${testUser.uid}`)
    expect(heading()).toHaveTextContent('Gökay — Kart Eli')
  })

  it('opens the DM on the first player of the list who is not the DM', () => {
    const { router } = renderApp({
      path: '/hands',
      users: { currentProfile: ready(dmProfile), profiles: ready([ayla, bora, dmProfile]) },
    })

    expect(router.state.location.pathname).toBe('/hands/ayla')
    expect(heading()).toHaveTextContent('Ayla — Kart Eli')
  })

  it("opens the DM's own hand when there is no other player", () => {
    const { router } = renderApp({
      path: '/hands',
      users: { currentProfile: ready(dmProfile), profiles: ready([dmProfile]) },
    })

    expect(router.state.location.pathname).toBe(`/hands/${testUser.uid}`)
  })

  it('replaces the menu URL, so going back does not return to it', () => {
    const { router } = renderApp({ path: '/hands' })

    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('waits for the profiles before choosing a hand', () => {
    const { router, setUsers } = renderApp({
      path: '/hands',
      users: { currentProfile: ready(dmProfile), profiles: { status: 'loading' } },
    })
    expect(main().getByRole('status')).toHaveTextContent('El açılıyor…')
    expect(router.state.location.pathname).toBe('/hands')

    setUsers({ currentProfile: ready(dmProfile), profiles: ready([bora, dmProfile]) })

    expect(router.state.location.pathname).toBe('/hands/bora')
  })
})

describe('a hand URL', () => {
  it('shows that hand directly, as after a reload', () => {
    renderApp({ path: '/hands/bora', users: { profiles: ready([me, bora]) } })

    expect(heading()).toHaveTextContent('Bora — Kart Eli')
  })

  it('says in Turkish when the user ID has no profile', () => {
    renderApp({ path: '/hands/nobody', users: { profiles: ready([me]) } })

    expect(heading()).toHaveTextContent('Oyuncu elleri')
    expect(screen.getByText('Böyle bir oyuncu yok.')).toBeInTheDocument()
  })

  it('waits while the own profile is being created', () => {
    renderApp({
      path: `/hands/${testUser.uid}`,
      users: { currentProfile: ready(null), profiles: ready([]) },
    })

    expect(main().getByRole('status')).toHaveTextContent('Profil hazırlanıyor…')
  })

  it('says so when the profiles cannot be read', () => {
    renderApp({
      path: '/hands/bora',
      users: {
        profiles: { status: 'error', error: { kind: 'unknown', message: 'x', path: 'users' } },
      },
    })

    expect(main().getByRole('alert')).toHaveTextContent('Oyuncular yüklenemedi.')
  })
})
