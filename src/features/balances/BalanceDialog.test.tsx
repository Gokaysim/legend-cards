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
