import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { handPath } from '@/app/screens'
import { resetDeviceSettingsMemory } from '@/lib/deviceSetting'
import { ready, testProfile } from '@/test/fixtures'

import { PLAYERS_HIDE_OFFLINE_KEY, PLAYERS_OPEN_KEY, PlayerList } from './PlayerList'
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

// Spec: user-profiles, "Player list", "Online mark in the player list", "Online count next to the heading" and
// "Hiding offline users" (show-online-players).
describe('online users', () => {
  const PEOPLE = ['Ayla', 'Bora', 'Can', 'Deniz', 'Gökay'].map((name) =>
    testProfile({ id: name.toLowerCase(), displayName: name }),
  )
  const online = (...uids: string[]) => ready<ReadonlySet<string>>(new Set(uids))
  const toggle = () => screen.getByRole('button', { name: /Oyuncular/ })
  const hideButton = () => screen.getByRole('button', { name: 'Çevrimdışıları gizle' })
  const names = () =>
    within(list())
      .getAllByRole('link')
      .map((link) => link.textContent?.slice(1))
  const entry = (name: string) =>
    within(list())
      .getAllByRole('listitem')
      .find((item) => within(item).queryByRole('link', { name }))!
  const isMarked = (name: string) =>
    within(entry(name)).queryByTestId('online-dot') !== null &&
    within(entry(name)).queryByText('çevrimiçi') !== null

  it('shows the online users first, each group in name order', () => {
    renderList(<PlayerList profiles={ready(PEOPLE)} online={online('can', 'gökay')} />)

    expect(names()).toEqual(['Can', 'Gökay', 'Ayla', 'Bora', 'Deniz'])
  })

  it('moves a user who comes online into the online group, without a reload', () => {
    const { rerender } = renderList(<PlayerList profiles={ready(PEOPLE)} online={online('can')} />)

    rerender(<PlayerList profiles={ready(PEOPLE)} online={online('can', 'deniz')} />)

    expect(names()).toEqual(['Can', 'Deniz', 'Ayla', 'Bora', 'Gökay'])
  })

  it('keeps the name order and marks only the signed-in user before presence has loaded', () => {
    renderList(<PlayerList profiles={ready(PEOPLE)} selfUid="deniz" />)

    expect(names()).toEqual(['Ayla', 'Bora', 'Can', 'Deniz', 'Gökay'])
    expect(PEOPLE.filter((p) => isMarked(p.displayName ?? '')).map((p) => p.id)).toEqual(['deniz'])
    expect(toggle()).toHaveTextContent('Oyuncular(5)')
  })

  it('marks an online user for the eye and for screen readers, and keeps the link named by the user alone', () => {
    renderList(<PlayerList profiles={ready(PEOPLE)} online={online('ayla')} />)

    expect(isMarked('Ayla')).toBe(true)
    expect(within(list()).getByRole('link', { name: 'Ayla' })).toBeInTheDocument()
    expect(isMarked('Can')).toBe(false)
    expect(within(entry('Can')).queryByTestId('online-dot')).toBeNull()
  })

  it('takes the mark away when a user goes offline, without a reload', () => {
    const { rerender } = renderList(<PlayerList profiles={ready(PEOPLE)} online={online('ayla')} />)

    rerender(<PlayerList profiles={ready(PEOPLE)} online={online()} />)

    expect(isMarked('Ayla')).toBe(false)
  })

  it('counts the online users next to the heading, open or closed', async () => {
    const user = userEvent.setup()
    const { rerender } = renderList(
      <PlayerList profiles={ready(PEOPLE.slice(0, 4))} online={online('ayla', 'bora', 'can')} />,
    )
    expect(toggle()).toHaveTextContent('Oyuncular(4 · 3 çevrimiçi)')

    await user.click(toggle())
    rerender(
      <PlayerList
        profiles={ready(PEOPLE.slice(0, 4))}
        online={online('ayla', 'bora', 'can', 'deniz')}
      />,
    )
    expect(toggle()).toHaveTextContent('(4 · 4 çevrimiçi)')
  })

  it('hides the offline users and shows them again, with the same count', async () => {
    const user = userEvent.setup()
    const four = PEOPLE.filter((p) => p.id !== 'deniz')
    renderList(<PlayerList profiles={ready(four)} online={online('ayla', 'gökay')} />)
    expect(hideButton()).toHaveAttribute('aria-pressed', 'false')

    await user.click(hideButton())
    expect(hideButton()).toHaveAttribute('aria-pressed', 'true')
    expect(names()).toEqual(['Ayla', 'Gökay'])
    expect(toggle()).toHaveTextContent('Oyuncular(4 · 2 çevrimiçi)')

    await user.click(hideButton())
    expect(names()).toEqual(['Ayla', 'Gökay', 'Bora', 'Can'])
  })

  it('shows a user who comes online while offline users are hidden', async () => {
    const user = userEvent.setup()
    const { rerender } = renderList(<PlayerList profiles={ready(PEOPLE)} online={online('ayla')} />)
    await user.click(hideButton())

    rerender(<PlayerList profiles={ready(PEOPLE)} online={online('ayla', 'bora')} />)

    expect(names()).toEqual(['Ayla', 'Bora'])
  })

  it('keeps the user whose hand is shown while offline users are hidden', async () => {
    const user = userEvent.setup()
    renderList(<PlayerList profiles={ready(PEOPLE)} online={online('ayla')} />, handPath('can'))
    await user.click(hideButton())

    expect(names()).toEqual(['Ayla', 'Can'])
    expect(within(list()).getByRole('link', { name: 'Can' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(isMarked('Can')).toBe(false)
  })

  it('remembers the choice on the device, for the sidebar and the mobile menu alike', async () => {
    const user = userEvent.setup()
    const { unmount } = renderList(<PlayerList profiles={ready(PEOPLE)} online={online('ayla')} />)
    await user.click(hideButton())
    unmount()

    expect(window.localStorage.getItem(PLAYERS_HIDE_OFFLINE_KEY)).toBe('1')
    renderList(<PlayerList profiles={ready(PEOPLE)} online={online('ayla')} />)
    expect(hideButton()).toHaveAttribute('aria-pressed', 'true')
    expect(names()).toEqual(['Ayla'])
  })

  it('shows no hide button while the list is closed', async () => {
    const user = userEvent.setup()
    renderList(<PlayerList profiles={ready(PEOPLE)} online={online('ayla')} />)

    await user.click(toggle())

    expect(screen.queryByRole('button', { name: 'Çevrimdışıları gizle' })).toBeNull()
  })

  it('shows everyone while presence is loading, even with offline users hidden', () => {
    window.localStorage.setItem(PLAYERS_HIDE_OFFLINE_KEY, '1')
    renderList(<PlayerList profiles={ready(PEOPLE)} />)

    expect(names()).toEqual(['Ayla', 'Bora', 'Can', 'Deniz', 'Gökay'])
  })
})
