import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PlayerDrawMode } from '@/features/table/playerDraw'
import type { TableActions } from '@/features/table/tableContext'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { TestAuthProvider } from '@/test/TestAuthProvider'
import { TestTableProvider } from '@/test/TestTableProvider'
import { TestUsersProvider } from '@/test/TestUsersProvider'

import { SettingsPage } from './SettingsPage'

afterEach(() => {
  vi.restoreAllMocks()
})

const dm = testProfile({ role: 'dm' })
const player = testProfile()

function setup({
  asDm = true,
  playerDraw = 'off',
  setPlayerDrawMode = () => Promise.resolve(),
}: {
  asDm?: boolean
  playerDraw?: PlayerDrawMode
  setPlayerDrawMode?: TableActions['setPlayerDrawMode']
} = {}) {
  const user = userEvent.setup()
  const change = vi.fn<TableActions['setPlayerDrawMode']>(setPlayerDrawMode)
  render(
    <TestAuthProvider state={{ status: 'signedIn', user: testUser }}>
      <TestUsersProvider currentProfile={ready(asDm ? dm : player)}>
        <TestTableProvider playerDraw={playerDraw} actions={{ setPlayerDrawMode: change }}>
          <SettingsPage />
        </TestTableProvider>
      </TestUsersProvider>
    </TestAuthProvider>,
  )
  return { user, change }
}

const group = () => screen.getByRole('group', { name: 'Oyuncu kart çekişi' })
const option = (name: string) => within(group()).getByRole('radio', { name })

describe('the Ayarlar screen', () => {
  it('shows the title, the table settings and the data section to come', () => {
    setup()

    expect(screen.getByRole('heading', { level: 1, name: 'Ayarlar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Masa ayarları' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Veri / Yedek' })).toBeInTheDocument()
    expect(screen.getByText('Yakında: verileri yedekleme ve geri yükleme.')).toBeInTheDocument()
  })

  it('shows Kapalı chosen on a new table, with a line for each mode', () => {
    setup()

    expect(option('Kapalı')).toBeChecked()
    expect(option('Filtreli çekiş')).not.toBeChecked()
    expect(option('Kart seçme')).toHaveAccessibleDescription(
      'Oyuncular ayrıca kelimeyle arayıp destede ne olduğuna bakabilir; istedikleri kartı seçip çekebilir.',
    )
  })

  it("sets the DM's choice as the signed-in DM", async () => {
    const { user, change } = setup()

    await user.click(option('Kart seçme'))

    expect(change).toHaveBeenCalledExactlyOnceWith({ mode: 'pick', by: testUser.uid })
  })

  it('shows a player the stored mode, without a way to change it', () => {
    setup({ asDm: false, playerDraw: 'filtered' })

    expect(option('Filtreli çekiş')).toBeChecked()
    for (const name of ['Kapalı', 'Filtreli çekiş', 'Kart seçme']) {
      expect(option(name)).toBeDisabled()
    }
    expect(screen.getByText('Bu ayarları DM değiştirir.')).toBeInTheDocument()
  })

  it('needs a connection, and changes nothing offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    const { user, change } = setup()

    await user.click(option('Filtreli çekiş'))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Bağlantı yok: masa ayarını değiştirmek için internet bağlantısı gerekiyor.',
    )
    expect(change).not.toHaveBeenCalled()
  })

  it('explains a refused change in Turkish', async () => {
    const { user } = setup({
      setPlayerDrawMode: () =>
        Promise.reject(Object.assign(new Error('denied'), { code: 'permission-denied' })),
    })

    await user.click(option('Filtreli çekiş'))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Masa ayarlarını yalnızca DM değiştirebilir.',
    )
  })
})
