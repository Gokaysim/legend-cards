import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { BalanceActions } from '@/features/balances/balancesContext'

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

describe('Legend Points on the hand', () => {
  const aylaWithLp = { ...ayla, lp: 7 }
  /** The value of a stat in the hand summary, by its label. */
  const stat = (label: string) =>
    within(screen.getByLabelText('El özeti')).getByText(label).nextElementSibling?.textContent

  it("shows a player's LP as the first stat", () => {
    renderApp({ path: '/hands/ayla', users: { profiles: ready([aylaWithLp, me]) } })

    expect(stat('Legend Point')).toBe('7')
    const labels = within(screen.getByLabelText('El özeti'))
      .getAllByRole('term')
      .map((term) => term.textContent)
    expect(labels[0]).toBe('Legend Point')
  })

  it('offers players no LP change, not even on their own hand', () => {
    renderApp({ path: `/hands/${testUser.uid}`, users: { profiles: ready([ayla, me]) } })
    expect(main().queryByRole('button', { name: /LP'sini değiştir/ })).not.toBeInTheDocument()
  })

  it("lets the DM change a player's LP from the hand", async () => {
    const user = userEvent.setup()
    const changeBalance = vi.fn<BalanceActions['changeBalance']>(() => Promise.resolve('e1'))
    renderApp({
      path: '/hands/ayla',
      users: { currentProfile: ready(dmProfile), profiles: ready([aylaWithLp, dmProfile]) },
      balances: { actions: { changeBalance } },
    })

    await user.click(main().getByRole('button', { name: "Ayla'nın LP'sini değiştir" }))
    const dialog = within(screen.getByRole('dialog', { name: 'Legend Point: Ayla' }))
    await user.type(dialog.getByRole('spinbutton', { name: 'Miktar' }), '2')
    await user.type(dialog.getByRole('textbox', { name: 'Neden' }), "Boss'u yendi")
    await user.click(dialog.getByRole('button', { name: '+ Ekle' }))

    expect(changeBalance).toHaveBeenCalledExactlyOnceWith({
      account: { currency: 'lp', uid: 'ayla' },
      delta: 2,
      reason: "Boss'u yendi",
      by: testUser.uid,
    })
  })

  it('shows the new LP live', () => {
    const { setUsers } = renderApp({
      path: '/hands/ayla',
      users: { profiles: ready([aylaWithLp, me]) },
    })
    setUsers({ profiles: ready([{ ...aylaWithLp, lp: 9 }, me]) })
    expect(stat('Legend Point')).toBe('9')
  })

  it("shows no LP on the DM's own hand", () => {
    renderApp({
      path: `/hands/${testUser.uid}`,
      users: { currentProfile: ready(dmProfile), profiles: ready([dmProfile]) },
    })
    expect(
      within(screen.getByLabelText('El özeti')).queryByText('Legend Point'),
    ).not.toBeInTheDocument()
  })
})
