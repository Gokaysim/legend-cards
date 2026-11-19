import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resetDeviceSettingsMemory } from '@/lib/deviceSetting'
import { ready, testProfile } from '@/test/fixtures'

import { PLAYERS_OPEN_KEY, PlayerList } from './PlayerList'
import { sortProfiles } from './usersContext'

/** Shows the current path, so a test can see where a link went. */
function CurrentPath() {
  return <output aria-label="Adres">{useLocation().pathname}</output>
}

/** Renders the list inside a router at `path`. */
function renderList(ui: ReactElement, path = '/rules') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>
      {children}
      <Routes>
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>
  )
  return render(ui, { wrapper })
}

const list = () => screen.getByRole('region', { name: 'Oyuncular' })
const rowNames = () =>
  within(list())
    .getAllByRole('link')
    .map((link) => link.textContent)

beforeEach(() => {
  window.localStorage.clear()
  resetDeviceSettingsMemory()
})

describe('PlayerList', () => {
  it('lists the profiles in Turkish name order', () => {
    const profiles = sortProfiles([
      testProfile({ id: 'a', displayName: 'Deniz' }),
      testProfile({ id: 'b', displayName: 'Çağla' }),
      testProfile({ id: 'c', displayName: 'Cem' }),
    ])
    renderList(<PlayerList profiles={ready(profiles)} />)

    expect(rowNames()).toEqual(['CCem', 'ÇÇağla', 'DDeniz'])
  })

  it('marks the DM, and only the DM', () => {
    renderList(
      <PlayerList
        profiles={ready([
          testProfile({ id: 'a', displayName: 'Ali' }),
          testProfile({ id: 'b', displayName: 'Dana', role: 'dm' }),
        ])}
      />,
    )

    const [ali, dana] = within(list()).getAllByRole('listitem')
    expect(within(dana!).getByText('DM')).toBeInTheDocument()
    expect(within(ali!).queryByText('DM')).not.toBeInTheDocument()
  })

  it('shows a label for a profile without a name', () => {
    renderList(<PlayerList profiles={ready([testProfile({ displayName: null })])} />)

    expect(within(list()).getByText('İsimsiz oyuncu')).toBeInTheDocument()
  })

  it('shows the loading, error and empty states', () => {
    const { rerender } = renderList(<PlayerList profiles={{ status: 'loading' }} />)
    expect(within(list()).getByRole('status')).toHaveTextContent('Oyuncular yükleniyor…')

    rerender(
      <PlayerList
        profiles={{ status: 'error', error: { kind: 'unknown', message: 'x', path: 'users' } }}
      />,
    )
    expect(within(list()).getByRole('alert')).toHaveTextContent('Oyuncu listesi yüklenemedi.')

    rerender(<PlayerList profiles={ready([])} />)
    expect(within(list()).getByText('Henüz oyuncu yok')).toBeInTheDocument()
  })

  it('shows a new profile as soon as the list changes', () => {
    const first = testProfile({ id: 'a', displayName: 'Ali' })
    const { rerender } = renderList(<PlayerList profiles={ready([first])} />)
    expect(rowNames()).toEqual(['AAli'])

    rerender(
      <PlayerList profiles={ready([first, testProfile({ id: 'b', displayName: 'Banu' })])} />,
    )

    expect(rowNames()).toEqual(['AAli', 'BBanu'])
  })

  it("links each name to that user's hand", async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    renderList(
      <PlayerList
        profiles={ready([
          testProfile({ id: 'ayla', displayName: 'Ayla' }),
          testProfile({ id: 'bora', displayName: 'Bora' }),
        ])}
        onNavigate={onNavigate}
      />,
    )

    await user.click(within(list()).getByRole('link', { name: 'Bora' }))

    expect(screen.getByRole('status', { name: 'Adres' })).toHaveTextContent('/hands/bora')
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it('marks the user whose hand is shown, and only that user', () => {
    renderList(
      <PlayerList
        profiles={ready([
          testProfile({ id: 'ayla', displayName: 'Ayla' }),
          testProfile({ id: 'bora', displayName: 'Bora', role: 'dm' }),
        ])}
      />,
      '/hands/bora',
    )

    expect(within(list()).getByRole('link', { name: /Bora/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(list()).getByRole('link', { name: 'Ayla' })).not.toHaveAttribute('aria-current')
  })

  it("shows every user's LP next to the name, a DM's included", () => {
    renderList(
      <PlayerList
        profiles={ready([
          testProfile({ id: 'a', displayName: 'Ayla', lp: 7 }),
          testProfile({ id: 'b', displayName: 'Dana', role: 'dm', lp: 2 }),
          testProfile({ id: 'c', displayName: 'Zeki', lp: 12500 }),
        ])}
      />,
    )

    const [ayla, dana, zeki] = within(list()).getAllByRole('listitem')
    expect(ayla).toHaveTextContent('7 LP')
    expect(within(ayla!).getByRole('link')).toHaveAccessibleName('Ayla')
    expect(dana).toHaveTextContent('2 LP')
    expect(zeki).toHaveTextContent('12.500 LP')
  })

  it('marks every DM when there are several', () => {
    renderList(
      <PlayerList
        profiles={ready([
          testProfile({ id: 'a', displayName: 'Ayla', role: 'dm' }),
          testProfile({ id: 'b', displayName: 'Bora' }),
          testProfile({ id: 'c', displayName: 'Gökay', role: 'dm' }),
        ])}
      />,
    )

    const [ayla, bora, gokay] = within(list()).getAllByRole('listitem')
    expect(ayla).toHaveTextContent('DM')
    expect(bora).not.toHaveTextContent('DM')
    expect(gokay).toHaveTextContent('DM')
  })

  it('shows the new LP when it changes, without a reload', () => {
    const before = [testProfile({ id: 'a', displayName: 'Ayla', lp: 7 })]
    const { rerender } = renderList(<PlayerList profiles={ready(before)} />)

    rerender(<PlayerList profiles={ready([{ ...before[0]!, lp: 9 }])} />)

    expect(within(list()).getByRole('listitem')).toHaveTextContent('9 LP')
  })
})

describe('collapsing the list', () => {
  const FIVE = ['Ayla', 'Bora', 'Cem', 'Dana', 'Ece'].map((name) =>
    testProfile({ id: name.toLowerCase(), displayName: name }),
  )
  const toggle = () => screen.getByRole('button', { name: /Oyuncular/ })

  it('starts open, with the number of users next to the heading', () => {
    renderList(<PlayerList profiles={ready(FIVE)} />)

    expect(toggle()).toHaveTextContent('Oyuncular(5)')
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(within(list()).getAllByRole('link')).toHaveLength(5)
  })

  it('hides the names and shows them again', async () => {
    const user = userEvent.setup()
    renderList(<PlayerList profiles={ready(FIVE)} />)

    await user.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(within(list()).queryAllByRole('link')).toHaveLength(0)
    expect(toggle()).toHaveTextContent('(5)')

    await user.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    expect(within(list()).getAllByRole('link')).toHaveLength(5)
  })

  it('names the list it controls', () => {
    renderList(<PlayerList profiles={ready(FIVE)} />)

    const controlled = document.getElementById(toggle().getAttribute('aria-controls') ?? '')
    expect(controlled).not.toBeNull()
    expect(within(controlled as HTMLElement).getAllByRole('link')).toHaveLength(5)
  })

  it('stays closed after a remount, as after a reload, and in another list on the device', async () => {
    const user = userEvent.setup()
    const { unmount } = renderList(<PlayerList profiles={ready(FIVE)} />)
    await user.click(toggle())
    unmount()

    expect(window.localStorage.getItem(PLAYERS_OPEN_KEY)).toBe('0')
    renderList(<PlayerList profiles={ready(FIVE)} />)
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  it('counts a new user live while closed', async () => {
    const user = userEvent.setup()
    const { rerender } = renderList(<PlayerList profiles={ready(FIVE)} />)
    await user.click(toggle())

    rerender(
      <PlayerList profiles={ready([...FIVE, testProfile({ id: 'fadi', displayName: 'Fadi' })])} />,
    )

    expect(toggle()).toHaveTextContent('(6)')
  })
})
