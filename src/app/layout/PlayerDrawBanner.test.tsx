import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PlayerDrawMode } from '@/features/table/playerDraw'
import type { TableActions } from '@/features/table/tableContext'
import { ready, signedInAs, testProfile, testUser } from '@/test/fixtures'
import { TestAuthProvider } from '@/test/TestAuthProvider'
import { TestTableProvider } from '@/test/TestTableProvider'
import { TestUsersProvider } from '@/test/TestUsersProvider'

import { PlayerDrawBanner } from './PlayerDrawBanner'

afterEach(() => {
  vi.restoreAllMocks()
})

function setup({ asDm = false, playerDraw }: { asDm?: boolean; playerDraw: PlayerDrawMode }) {
  const user = userEvent.setup()
  const change = vi.fn<TableActions['setPlayerDrawMode']>(() => Promise.resolve())
  const { container } = render(
    <TestAuthProvider state={signedInAs(testUser)}>
      <TestUsersProvider currentProfile={ready(testProfile({ role: asDm ? 'dm' : 'player' }))}>
        <TestTableProvider playerDraw={playerDraw} actions={{ setPlayerDrawMode: change }}>
          <PlayerDrawBanner />
        </TestTableProvider>
      </TestUsersProvider>
    </TestAuthProvider>,
  )
  return { user, change, container }
}

describe('PlayerDrawBanner', () => {
  it('shows nothing under Kapalı', () => {
    const { container } = setup({ playerDraw: 'off' })

    expect(container).toBeEmptyDOMElement()
  })

  it('tells a player what Filtreli çekiş allows, without Kapat', () => {
    setup({ playerDraw: 'filtered' })

    expect(screen.getByRole('status')).toHaveTextContent(
      '✦ Filtreli çekiş açık. Oyuncular kart çekerken set, cost, mechanic pack ve rarity seçebilir; kart yine rastgele gelir. Bir çekiş 1 LP; çeken kişi fiyatı değiştirebilir.',
    )
    expect(screen.queryByRole('button', { name: 'Kapat' })).not.toBeInTheDocument()
  })

  it("closes the mode from the DM's banner", async () => {
    const { user, change } = setup({ asDm: true, playerDraw: 'pick' })

    expect(screen.getByRole('status')).toHaveTextContent('✦ Kart seçme açık.')
    await user.click(screen.getByRole('button', { name: 'Kapat' }))

    expect(change).toHaveBeenCalledExactlyOnceWith({ mode: 'off', by: testUser.uid })
  })

  it('needs a connection to close it', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    const { user, change } = setup({ asDm: true, playerDraw: 'pick' })

    await user.click(screen.getByRole('button', { name: 'Kapat' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Bağlantı yok: masa ayarını değiştirmek için internet bağlantısı gerekiyor.',
    )
    expect(change).not.toHaveBeenCalled()
  })
})
