import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { TabList, TabPanel } from './TabList'

type Id = 'cards' | 'cursed' | 'words'

const TABS = [
  { id: 'cards', label: '♠ Kartlar' },
  { id: 'cursed', label: '☠ Cursed' },
  { id: 'words', label: '✦ True Words' },
] as const satisfies readonly { id: Id; label: string }[]

function Tabs({ onChange }: { onChange?: (id: Id) => void }) {
  const [selected, setSelected] = useState<Id>('cards')
  return (
    <>
      <TabList
        tabs={TABS}
        selected={selected}
        onChange={(id) => {
          onChange?.(id)
          setSelected(id)
        }}
        label="Kütüphane"
        idPrefix="lib"
      />
      <TabPanel idPrefix="lib" selected={selected}>
        {`panel ${selected}`}
      </TabPanel>
    </>
  )
}

describe('TabList', () => {
  it('names the list and marks the selected tab', () => {
    render(<Tabs />)

    expect(screen.getByRole('tablist', { name: 'Kütüphane' })).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['♠ Kartlar', '☠ Cursed', '✦ True Words'])
    expect(screen.getByRole('tab', { name: '♠ Kartlar' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: '☠ Cursed' })).toHaveAttribute('aria-selected', 'false')
  })

  it('labels the panel with the selected tab, and every tab controls it', () => {
    render(<Tabs />)

    const panel = screen.getByRole('tabpanel', { name: '♠ Kartlar' })
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toHaveAttribute('aria-controls', panel.id)
    }
  })

  it('reports the chosen tab, and the panel follows it', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Tabs onChange={onChange} />)

    await user.click(screen.getByRole('tab', { name: '✦ True Words' }))

    expect(onChange).toHaveBeenCalledWith('words')
    expect(screen.getByRole('tab', { name: '✦ True Words' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tabpanel', { name: '✦ True Words' })).toHaveTextContent('panel words')
  })

  it('reaches every tab with the Tab key, in order', async () => {
    const user = userEvent.setup()
    render(<Tabs />)

    await user.tab()
    expect(screen.getByRole('tab', { name: '♠ Kartlar' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('tab', { name: '☠ Cursed' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('tab', { name: '✦ True Words' })).toHaveFocus()
  })
})
