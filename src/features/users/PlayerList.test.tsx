import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ready, testProfile } from '@/test/fixtures'

import { PlayerList } from './PlayerList'
import { sortProfiles } from './usersContext'

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
    render(<PlayerList profiles={ready(profiles)} />)

    expect(rowNames()).toEqual(['CCem', 'ÇÇağla', 'DDeniz'])
  })

  it('marks the DM, and only the DM', () => {
    render(
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
    render(<PlayerList profiles={ready([testProfile({ displayName: null })])} />)

    expect(within(list()).getByText('İsimsiz oyuncu')).toBeInTheDocument()
  })

  it('shows the loading, error and empty states', () => {
    const { rerender } = render(<PlayerList profiles={{ status: 'loading' }} />)
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
    const { rerender } = render(<PlayerList profiles={ready([first])} />)
    expect(rowNames()).toEqual(['AAli'])

    rerender(
      <PlayerList profiles={ready([first, testProfile({ id: 'b', displayName: 'Banu' })])} />,
    )

    expect(rowNames()).toEqual(['AAli', 'BBanu'])
  })
})
