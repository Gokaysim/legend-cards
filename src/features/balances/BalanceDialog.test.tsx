import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { testUser } from '@/test/fixtures'
import { TestAuthProvider } from '@/test/TestAuthProvider'
import { TestBalancesProvider } from '@/test/TestBalancesProvider'

import type { BalanceActions } from './balancesContext'
import { BalanceDialog, type BalanceDialogProps } from './BalanceDialog'
import { BalanceError } from './errors'

afterEach(() => {
  vi.restoreAllMocks()
})

const aylaLp: BalanceDialogProps = {
  currency: 'lp',
  uid: 'ayla',
  name: 'Ayla',
  balance: 3,
  onClose: () => {},
}

function setup(
  props: Partial<BalanceDialogProps> & Pick<BalanceDialogProps, 'currency'> = aylaLp,
  changeBalance?: BalanceActions['changeBalance'],
) {
  const user = userEvent.setup()
  const change = vi.fn<BalanceActions['changeBalance']>(
    changeBalance ?? (() => Promise.resolve('entry')),
  )
  const onClose = vi.fn()
  render(
    <TestAuthProvider state={{ status: 'signedIn', user: testUser }}>
      <TestBalancesProvider actions={{ changeBalance: change }}>
        <BalanceDialog {...({ ...aylaLp, ...props, onClose } as BalanceDialogProps)} />
      </TestBalancesProvider>
    </TestAuthProvider>,
  )
  return { user, change, onClose }
}

const amount = () => screen.getByRole('spinbutton', { name: 'Miktar' })
const reason = () => screen.getByRole('textbox', { name: 'Neden' })
const add = () => screen.getByRole('button', { name: '+ Ekle' })
const subtract = () => screen.getByRole('button', { name: '− Düş' })

async function fill(user: ReturnType<typeof userEvent.setup>, value: string, why: string) {
  await user.clear(amount())
  if (value !== '') await user.type(amount(), value)
  await user.clear(reason())
  if (why !== '') await user.type(reason(), why)
}

describe('BalanceDialog', () => {
  it("names the player's LP and its balance, with the focus on the amount", () => {
    setup()
    expect(screen.getByRole('dialog', { name: 'Legend Point: Ayla' })).toBeInTheDocument()
    expect(screen.getByText('3 LP')).toBeInTheDocument()
    expect(amount()).toHaveFocus()
  })

  it('names the party purse with digit grouping', () => {
    setup({ currency: 'gp', balance: 12500 })
    expect(screen.getByRole('dialog', { name: 'Grup kesesi' })).toBeInTheDocument()
    expect(screen.getByText('12.500 GP')).toBeInTheDocument()
  })

  it('stays disabled until the amount is a whole number in range and the reason is not blank', async () => {
    const { user } = setup()
    expect(add()).toBeDisabled()

    await fill(user, '2', '')
    expect(add()).toBeDisabled()
    await fill(user, '2', '   ')
    expect(add()).toBeDisabled()
    await fill(user, '0', 'x')
    expect(add()).toBeDisabled()
    await fill(user, '1.5', 'x')
    expect(add()).toBeDisabled()
    await fill(user, '1000001', 'x')
    expect(add()).toBeDisabled()

    await fill(user, '1000000', "Boss'u yendi")
    expect(add()).toBeEnabled()
    expect(subtract()).toBeEnabled()
  })

  it('adds with the reason for the right account, and closes', async () => {
    const { user, change, onClose } = setup()
    await fill(user, '2', "Boss'u yendi")

    await user.click(add())

    expect(change).toHaveBeenCalledExactlyOnceWith({
      account: { currency: 'lp', uid: 'ayla' },
      delta: 2,
      reason: "Boss'u yendi",
      by: testUser.uid,
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('subtracts from the party purse', async () => {
    const { user, change } = setup({ currency: 'gp', balance: 12500 })
    await fill(user, '2500', 'Pack')

    await user.click(subtract())

    expect(change).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ account: { currency: 'gp' }, delta: -2500 }),
    )
  })

  it('refuses to subtract more than the balance, naming the balance', async () => {
    const { user, change, onClose } = setup()
    await fill(user, '5', 'Fazla')

    await user.click(subtract())

    expect(change).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent("Ayla'nın 3 LP'si var; 5 LP düşülemez.")
  })

  it('shows the balance the server found when it changed meanwhile', async () => {
    const { user, onClose } = setup({ currency: 'gp', balance: 12500 }, () =>
      Promise.reject(new BalanceError('insufficient', 2500)),
    )
    await fill(user, '5000', 'Pack')

    await user.click(subtract())

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Grup kesesinde 2.500 GP var; 5.000 GP düşülemez.',
    )
    expect(add()).toBeEnabled()
  })

  it('does not try a change offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { user, change } = setup()
    await fill(user, '2', 'x')

    await user.click(add())

    expect(change).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Bağlantı yok: LP ve GP değişiklikleri için internet bağlantısı gerekiyor.',
    )
  })

  it('shows a Turkish error for other failures', async () => {
    const { user } = setup(aylaLp, () =>
      Promise.reject(Object.assign(new Error('x'), { code: 'permission-denied' })),
    )
    await fill(user, '2', 'x')

    await user.click(add())

    expect(screen.getByRole('alert')).toHaveTextContent('Bu işlem için yetkin yok.')
  })
})

describe("BalanceDialog's spend variant", () => {
  const aylaSpends: BalanceDialogProps = { ...aylaLp, balance: 5, isSpend: true }

  it('opens with the LP now, the amount 1, the LP after, and only a disabled "− Düş"', () => {
    setup(aylaSpends)

    expect(screen.getByRole('dialog', { name: 'Legend Point harca' })).toBeInTheDocument()
    expect(screen.getByText('Şu an:', { exact: false })).toHaveTextContent('Şu an: 5 LP')
    expect(amount()).toHaveValue(1)
    expect(reason()).toHaveValue('')
    expect(screen.getByText('Sonra:', { exact: false })).toHaveTextContent('Sonra: 4 LP')
    expect(subtract()).toBeDisabled()
    expect(screen.queryByRole('button', { name: '+ Ekle' })).not.toBeInTheDocument()
  })

  it('fills the reason and resets the amount to 1 with the "d20 avantajı" shortcut', async () => {
    const { user } = setup(aylaSpends)
    await fill(user, '3', '')
    expect(screen.getByText('Sonra:', { exact: false })).toHaveTextContent('Sonra: 2 LP')

    await user.click(screen.getByRole('button', { name: 'd20 avantajı' }))

    expect(reason()).toHaveValue('d20 avantajı')
    expect(amount()).toHaveValue(1)
    expect(screen.getByRole('button', { name: 'd20 avantajı' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(subtract()).toBeEnabled()
  })

  it('hides the LP after while the amount is not a whole number up to the LP', async () => {
    const { user } = setup(aylaSpends)
    await fill(user, '6', 'x')
    expect(screen.queryByText('Sonra:', { exact: false })).not.toBeInTheDocument()
    await fill(user, '1.5', 'x')
    expect(screen.queryByText('Sonra:', { exact: false })).not.toBeInTheDocument()
  })

  it("spends from the player's own LP and closes", async () => {
    const { user, change, onClose } = setup(aylaSpends)

    await user.click(screen.getByRole('button', { name: 'd20 avantajı' }))
    await user.click(subtract())

    expect(change).toHaveBeenCalledExactlyOnceWith({
      account: { currency: 'lp', uid: 'ayla' },
      delta: -1,
      reason: 'd20 avantajı',
      by: testUser.uid,
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('refuses to spend more than the LP, naming the LP', async () => {
    const { user, change } = setup({ ...aylaSpends, balance: 1 })
    await fill(user, '2', 'd20 avantajı')

    await user.click(subtract())

    expect(change).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent("Ayla'nın 1 LP'si var; 2 LP düşülemez.")
  })

  it('does not try a spend offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { user, change } = setup(aylaSpends)
    await user.click(screen.getByRole('button', { name: 'd20 avantajı' }))

    await user.click(subtract())

    expect(change).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Bağlantı yok: LP ve GP değişiklikleri için internet bağlantısı gerekiyor.',
    )
  })
})
