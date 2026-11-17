import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AccessEntry } from '@/features/access/schema'
import type { DiceActions } from '@/features/dice/diceContext'
import { DiceResetIncompleteError } from '@/features/dice/errors'
import type { DiceRoll } from '@/features/dice/schema'
import type { PlayerDrawMode } from '@/features/table/playerDraw'
import type { TableActions } from '@/features/table/tableContext'
import { testCombat } from '@/test/combatFixtures'
import { testRoll } from '@/test/diceFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { TestAccessProvider } from '@/test/TestAccessProvider'
import { TestAuthProvider } from '@/test/TestAuthProvider'
import { TestCombatProvider } from '@/test/TestCombatProvider'
import { TestDiceProvider } from '@/test/TestDiceProvider'
import { TestTableProvider } from '@/test/TestTableProvider'
import { TestUsersProvider } from '@/test/TestUsersProvider'

import { SettingsPage } from './SettingsPage'

afterEach(() => {
  vi.restoreAllMocks()
})

const dm = testProfile({ role: 'dm' })
const player = testProfile()
const ENTRIES: AccessEntry[] = [
  { email: 'player@example.com', addedAt: Timestamp.fromMillis(0), uid: testUser.uid },
  { email: 'bora@example.com', addedAt: Timestamp.fromMillis(0) },
]

const ROLLS: readonly DiceRoll[] = [testRoll({ by: 'bora' }), testRoll({ by: 'cem' })]

function setup({
  asDm = true,
  playerDraw = 'off',
  setPlayerDrawMode = () => Promise.resolve(),
  rolls = ROLLS,
  countRolls = () => Promise.resolve(142),
  resetChannel = () => Promise.resolve(142),
  isCombatOpen = false,
}: {
  asDm?: boolean
  playerDraw?: PlayerDrawMode
  setPlayerDrawMode?: TableActions['setPlayerDrawMode']
  rolls?: readonly DiceRoll[]
  countRolls?: DiceActions['countRolls']
  resetChannel?: DiceActions['resetChannel']
  isCombatOpen?: boolean
} = {}) {
  const user = userEvent.setup()
  const change = vi.fn<TableActions['setPlayerDrawMode']>(setPlayerDrawMode)
  const count = vi.fn<DiceActions['countRolls']>(countRolls)
  const reset = vi.fn<DiceActions['resetChannel']>(resetChannel)
  render(
    <TestAuthProvider state={{ status: 'signedIn', user: testUser }}>
      <TestUsersProvider currentProfile={ready(asDm ? dm : player)}>
        <TestAccessProvider entries={ready(ENTRIES)}>
          <TestTableProvider playerDraw={playerDraw} actions={{ setPlayerDrawMode: change }}>
            <TestDiceProvider rolls={rolls} actions={{ countRolls: count, resetChannel: reset }}>
              <TestCombatProvider
                combat={isCombatOpen ? testCombat({ phase: 'gathering' }) : undefined}
              >
                <SettingsPage />
              </TestCombatProvider>
            </TestDiceProvider>
          </TestTableProvider>
        </TestAccessProvider>
      </TestUsersProvider>
    </TestAuthProvider>,
  )
  return { user, change, count, reset }
}

function goOffline() {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  act(() => {
    window.dispatchEvent(new Event('offline'))
  })
}

const group = () => screen.getByRole('group', { name: 'Oyuncu kart çekişi' })
const option = (name: string) => within(group()).getByRole('radio', { name })

describe('the Ayarlar screen', () => {
  it('shows the DM the table settings, the access list and the data section, in this order', () => {
    setup()

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Masa ayarları', 'Masaya erişim', 'Veri / Yedek'])
    expect(screen.getByText('bora@example.com')).toBeInTheDocument()
  })

  it('shows a player the table settings and the data section, and no address', () => {
    setup({ asDm: false })

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Masa ayarları', 'Veri / Yedek'])
    expect(screen.queryByText(/@example\.com/)).not.toBeInTheDocument()
  })

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
    goOffline()
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

describe('the dice channel reset (spec: dice-rolls, "Resetting the dice channel")', () => {
  const data = () => screen.getByRole('region', { name: 'Veri / Yedek' })
  const resetButton = () => within(data()).getByRole('button', { name: 'Zar kanalını sıfırla' })
  const dialog = () => screen.getByRole('dialog', { name: 'Zar kanalı sıfırlansın mı?' })

  it('shows the DM "Zar kanalı" with its line and the reset, and the backup note', () => {
    setup()

    expect(
      within(data()).getByRole('heading', { level: 3, name: 'Zar kanalı' }),
    ).toBeInTheDocument()
    expect(data()).toHaveTextContent(
      'Kanaldaki bütün atışları siler, gizli atışlar dahil. Kartlar, LP, inisiyatif ve İşlem Logu etkilenmez.',
    )
    expect(resetButton()).toBeEnabled()
    expect(data()).toHaveTextContent('Yakında: verileri yedekleme ve geri yükleme.')
  })

  it('shows a player only the backup note, and no reset', () => {
    setup({ asDm: false })

    expect(within(data()).queryByRole('button')).not.toBeInTheDocument()
    expect(within(data()).queryByText('Zar kanalı')).not.toBeInTheDocument()
    expect(data()).toHaveTextContent('Yakında: verileri yedekleme ve geri yükleme.')
  })

  it('disables the reset when the channel holds no rolls', () => {
    setup({ rolls: [] })
    expect(resetButton()).toBeDisabled()
  })

  it('asks first, naming the count from the server, and resets on "Sıfırla"', async () => {
    const { user, count, reset } = setup()

    await user.click(resetButton())

    expect(count).toHaveBeenCalledOnce()
    expect(dialog()).toHaveTextContent('142 atış kalıcı olarak silinecek. Bu geri alınamaz.')
    expect(dialog()).not.toHaveTextContent('Savaş açık')
    expect(reset).not.toHaveBeenCalled()

    await user.click(within(dialog()).getByRole('button', { name: 'Sıfırla' }))

    expect(reset).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(data()).getByRole('status')).toHaveTextContent(
      'Zar kanalı sıfırlandı: 142 atış silindi.',
    )
  })

  it('deletes nothing on "Vazgeç"', async () => {
    const { user, reset } = setup()

    await user.click(resetButton())
    await user.click(within(dialog()).getByRole('button', { name: 'Vazgeç' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(reset).not.toHaveBeenCalled()
  })

  it('says during a combat that the initiative order stays', async () => {
    const { user } = setup({ isCombatOpen: true })

    await user.click(resetButton())

    expect(dialog()).toHaveTextContent(
      'Savaş açık: inisiyatif sırası kalır, yalnızca kanaldaki atışlar silinir.',
    )
  })

  it('needs a connection, and neither counts nor deletes offline', async () => {
    goOffline()
    const { user, count, reset } = setup()

    await user.click(resetButton())

    expect(within(data()).getByRole('alert')).toHaveTextContent(
      'Bağlantı yok: zar kanalını sıfırlamak için internet bağlantısı gerekiyor.',
    )
    expect(count).not.toHaveBeenCalled()
    expect(reset).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('says when the connection dropped before the reset started', async () => {
    const { user } = setup({
      resetChannel: () =>
        Promise.reject(Object.assign(new Error('offline'), { code: 'unavailable' })),
    })

    await user.click(resetButton())
    await user.click(within(dialog()).getByRole('button', { name: 'Sıfırla' }))

    expect(within(data()).getByRole('alert')).toHaveTextContent(
      'Bağlantı yok: zar kanalını sıfırlamak için internet bağlantısı gerekiyor.',
    )
  })

  it('says when a reset stopped part way', async () => {
    const { user } = setup({
      resetChannel: () => Promise.reject(new DiceResetIncompleteError(new Error('lost'))),
    })

    await user.click(resetButton())
    await user.click(within(dialog()).getByRole('button', { name: 'Sıfırla' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(data()).getByRole('alert')).toHaveTextContent(
      'Bazı atışlar silinemedi; tekrar dene.',
    )
  })
})
