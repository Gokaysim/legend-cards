import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { ready, testProfile } from '@/test/fixtures'

import { PlayerList } from './PlayerList'
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
    .getAllByRole('listitem')
    .map((row) => row.textContent)

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
})
