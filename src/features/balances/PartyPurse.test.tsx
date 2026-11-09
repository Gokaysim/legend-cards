import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ready, testProfile, testUser } from '@/test/fixtures'
import { testPartyPurse } from '@/test/ledgerFixtures'
import { renderApp } from '@/test/renderApp'

import type { BalanceActions } from './balancesContext'

const dm = testProfile({ role: 'dm', displayName: 'Dana' })

/** The desktop sidebar (the mobile menu renders the same content only while it is open). */
const sidebar = () => within(screen.getByRole('complementary'))
const purse = () => within(sidebar().getByRole('region', { name: 'Grup kesesi' }))

describe('PartyPurse', () => {
  it('shows the purse with digit grouping, above the "Oyuncular" list', () => {
    renderApp({ path: '/library', balances: { partyPurse: ready(testPartyPurse(12500)) } })

    expect(purse().getByText('12.500 GP')).toBeInTheDocument()
    const purseRegion = sidebar().getByRole('region', { name: 'Grup kesesi' })
    const players = sidebar().getByRole('region', { name: 'Oyuncular' })
    expect(
      purseRegion.compareDocumentPosition(players) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('shows 0 GP before any GP change', () => {
    renderApp({ path: '/library' })
    expect(purse().getByText('0 GP')).toBeInTheDocument()
  })

  it('says when the purse is loading or cannot be loaded', () => {
    const { setBalances } = renderApp({
      path: '/library',
      balances: { partyPurse: { status: 'loading' } },
    })
    expect(purse().getByRole('status')).toHaveTextContent('Kese yükleniyor')

    setBalances({
      partyPurse: {
        status: 'error',
        error: { kind: 'permission-denied', message: 'x', path: 'party/main' },
      },
    })
    expect(purse().getByRole('alert')).toHaveTextContent('Kese yüklenemedi.')
  })

  it('updates live', () => {
    const { setBalances } = renderApp({
      path: '/library',
      balances: { partyPurse: ready(testPartyPurse(7500)) },
    })
    setBalances({ partyPurse: ready(testPartyPurse(12500)) })
    expect(purse().getByText('12.500 GP')).toBeInTheDocument()
  })

  it('offers players no GP change', () => {
    renderApp({ path: '/library', balances: { partyPurse: ready(testPartyPurse(7500)) } })
    expect(purse().queryByRole('button')).not.toBeInTheDocument()
  })

  it("disables the DM's GP change while a pack is open", () => {
    renderApp({
      path: '/library',
      users: { currentProfile: ready(dm), profiles: ready([dm]) },
      balances: { partyPurse: ready(testPartyPurse(7500)) },
      table: { openPackId: 'pack-1' },
    })

    expect(purse().getByRole('button', { name: 'Grup kesesini değiştir' })).toBeDisabled()
  })

  it('lets the DM change the purse from here', async () => {
    const user = userEvent.setup()
    const changeBalance = vi.fn<BalanceActions['changeBalance']>(() => Promise.resolve('e1'))
    renderApp({
      path: '/library',
      users: { currentProfile: ready(dm), profiles: ready([dm]) },
      balances: { partyPurse: ready(testPartyPurse(7500)), actions: { changeBalance } },
    })

    await user.click(purse().getByRole('button', { name: 'Grup kesesini değiştir' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Grup kesesi' }))
    expect(dialog.getByText('7.500 GP')).toBeInTheDocument()
    await user.type(dialog.getByRole('spinbutton', { name: 'Miktar' }), '5000')
    await user.type(dialog.getByRole('textbox', { name: 'Neden' }), 'Ejderha hazinesi')
    await user.click(dialog.getByRole('button', { name: '+ Ekle' }))

    expect(changeBalance).toHaveBeenCalledExactlyOnceWith({
      account: { currency: 'gp' },
      delta: 5000,
      reason: 'Ejderha hazinesi',
      by: testUser.uid,
    })
    expect(screen.queryByRole('dialog', { name: 'Grup kesesi' })).not.toBeInTheDocument()
  })
})
