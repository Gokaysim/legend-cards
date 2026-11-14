import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Dialog } from '@/components/ui/Dialog'

import { FilterBar } from './FilterBar'
import type { FacetChoice } from './filters'

const SETS: FacetChoice[] = [
  { value: 'Kesqer', label: 'Kesqerian Nights', count: 24 },
  { value: 'Havenholm', label: 'Throne of Havenholm', count: 22 },
]
const RARITIES: FacetChoice[] = [
  { value: 'common', label: 'Common', count: 98 },
  { value: 'rare', label: 'Rare', count: 24 },
  { value: 'blessed', label: 'Blessed', count: 0 },
]

function Bar({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [set, setSet] = useState<string | null>(null)
  const [rarity, setRarity] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  return (
    <Dialog title="Kart Çek" onClose={onClose}>
      <FilterBar
        pills={[
          { key: 'set', name: 'Set', choices: SETS, value: set, onChange: setSet },
          { key: 'rarity', name: 'Rarity', choices: RARITIES, value: rarity, onChange: setRarity },
        ]}
        keyword={{ value: keyword, onChange: setKeyword }}
        isActive={set !== null || rarity !== null || keyword !== ''}
        onClear={() => {
          setSet(null)
          setRarity(null)
          setKeyword('')
        }}
      />
      <p>Dışarısı</p>
    </Dialog>
  )
}

const pill = (name: RegExp) => screen.getByRole('button', { name })

describe('FilterBar', () => {
  it('opens a menu with each choice and its count, and chooses one', async () => {
    const user = userEvent.setup()
    render(<Bar />)

    await user.click(pill(/^Set/))
    const menu = screen.getByRole('menu', { name: 'Set' })
    expect(screen.getByRole('menuitemradio', { name: 'Tümü' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(
      screen.getByRole('menuitemradio', { name: 'Kesqerian Nights, 24 kart' }),
    ).toBeInTheDocument()
    expect(menu).toHaveTextContent('Throne of Havenholm22')
    expect(
      screen.getByRole('menuitemradio', { name: 'Throne of Havenholm, 22 kart' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('menuitemradio', { name: 'Kesqerian Nights, 24 kart' }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(pill(/^Set: Kesqerian Nights/)).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Temizle' })).toBeInTheDocument()
  })

  it('clears one filter with its "×", and every filter with "Temizle"', async () => {
    const user = userEvent.setup()
    render(<Bar />)
    await user.click(pill(/^Set/))
    await user.click(screen.getByRole('menuitemradio', { name: 'Kesqerian Nights, 24 kart' }))
    await user.click(pill(/^Rarity/))
    await user.click(screen.getByRole('menuitemradio', { name: 'Rare, 24 kart' }))

    await user.click(screen.getByRole('button', { name: 'Set filtresini kaldır' }))
    expect(pill(/^Set$/)).toBeInTheDocument()
    expect(pill(/^Rarity: Rare/)).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Kelime' }), 'kan')
    await user.click(screen.getByRole('button', { name: 'Temizle' }))
    expect(pill(/^Rarity$/)).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Kelime' })).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Temizle' })).not.toBeInTheDocument()
  })

  it('moves between items with the arrows, Home and End, starting on the checked one', async () => {
    const user = userEvent.setup()
    render(<Bar />)
    await user.click(pill(/^Rarity/))
    const item = (name: string) => screen.getByRole('menuitemradio', { name })

    expect(item('Tümü')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(item('Common, 98 kart')).toHaveFocus()
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(item('Blessed, 0 kart')).toHaveFocus()
    await user.keyboard('{Home}')
    expect(item('Tümü')).toHaveFocus()
    await user.keyboard('{End}')
    expect(item('Blessed, 0 kart')).toHaveFocus()
    await user.keyboard('{ArrowUp}{Enter}')
    expect(pill(/^Rarity: Rare/)).toHaveFocus()

    await user.click(pill(/^Rarity: Rare/))
    expect(item('Rare, 24 kart')).toHaveFocus()
  })

  it("closes the menu on Escape, gives the focus back, and keeps the dialog's cancel from closing it", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Bar onClose={onClose} />)
    await user.click(pill(/^Set/))

    // jsdom does not cancel a dialog on Escape: the dialog's own cancel event stands in for it.
    const cancel = new Event('cancel', { cancelable: true })
    act(() => {
      screen.getByRole('dialog').dispatchEvent(cancel)
    })

    expect(cancel.defaultPrevented).toBe(true)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(pill(/^Set/)).toHaveFocus()
    expect(onClose).not.toHaveBeenCalled()

    await user.click(pill(/^Set/))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(pill(/^Set/)).toHaveFocus()
  })

  it('leaves the dialog its cancel while no menu is open', () => {
    render(<Bar />)
    const cancel = new Event('cancel', { cancelable: true })
    screen.getByRole('dialog').dispatchEvent(cancel)
    expect(cancel.defaultPrevented).toBe(false)
  })

  it('closes the menu on a press outside it, and keeps one menu open at a time', async () => {
    const user = userEvent.setup()
    render(<Bar />)
    await user.click(pill(/^Set/))
    await user.click(screen.getByText('Dışarısı'))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await user.click(pill(/^Set/))
    await user.click(pill(/^Rarity/))
    expect(screen.getAllByRole('menu')).toHaveLength(1)
    expect(screen.getByRole('menu', { name: 'Rarity' })).toBeInTheDocument()
  })
})
