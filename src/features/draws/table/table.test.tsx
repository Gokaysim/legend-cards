import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DrawSpread } from './DrawSpread'
import { DrawTable } from './DrawTable'
import { LiveMark } from './LiveMark'
import { TableChip, TableChips } from './TableChip'

describe('DrawTable', () => {
  it('lays the source beside the cards on the usual tint', () => {
    render(
      <DrawTable source={<p>Deste</p>}>
        <p>Kartlar</p>
      </DrawTable>,
    )
    const table = screen.getByTestId('draw-table')
    expect(table).toHaveAttribute('data-tone', 'neutral')
    expect(table.className).toContain('var(--color-pane-raised)')
    expect(within(table).getByText('Deste')).toBeInTheDocument()
    expect(within(table).getByText('Kartlar')).toBeInTheDocument()
  })

  it('takes a deep red tint for a Cursed draw', () => {
    render(
      <DrawTable tone="cursed" source={null}>
        {null}
      </DrawTable>,
    )
    const table = screen.getByTestId('draw-table')
    expect(table).toHaveAttribute('data-tone', 'cursed')
    expect(table.className).toContain('var(--color-stat-cursed-deep)')
  })
})

describe('LiveMark', () => {
  it('pulses, and stops pulsing under reduced motion', () => {
    render(<LiveMark />)
    expect(screen.getByTestId('live-mark')).toHaveClass(
      'animate-live-pulse',
      'motion-reduce:animate-none',
      'bg-green',
    )
  })
})

describe('TableChip', () => {
  it('shows the live mark only on the live chip', () => {
    render(
      <TableChips label="Çekiş">
        <TableChip variant="live">Canlı</TableChip>
        <TableChip>Ayla'nın eline</TableChip>
      </TableChips>,
    )
    const chips = within(screen.getByRole('list', { name: 'Çekiş' })).getAllByRole('listitem')
    expect(chips).toHaveLength(2)
    expect(within(chips[0] as HTMLElement).getByTestId('live-mark')).toBeInTheDocument()
    expect(within(chips[1] as HTMLElement).queryByTestId('live-mark')).not.toBeInTheDocument()
  })
})

describe('DrawSpread', () => {
  it('turns and lifts the cards only with motion, so they lie straight under reduced motion', () => {
    render(
      <DrawSpread
        label="Kartlar"
        items={['a', 'b']}
        itemKey={(item) => item}
        renderItem={(item) => <span>{item}</span>}
      />,
    )
    const cards = within(screen.getByRole('list', { name: 'Kartlar' })).getAllByRole('listitem')
    expect(cards[0]).toHaveClass(
      '-mr-3',
      'motion-safe:-rotate-3',
      'motion-safe:hover:-translate-y-2.5',
    )
    expect(cards[1]).toHaveClass('motion-safe:rotate-1')
    for (const card of cards) {
      expect(card.className).not.toMatch(/(^|\s)-?rotate-/)
      expect(card.className).not.toMatch(/(^|\s)hover:-translate/)
    }
  })

  it('lays a pack smaller than a draw', () => {
    render(
      <DrawSpread
        label="Pack"
        size="pack"
        items={['a']}
        itemKey={(item) => item}
        renderItem={(item) => <span>{item}</span>}
      />,
    )
    const [card] = within(screen.getByRole('list', { name: 'Pack' })).getAllByRole('listitem')
    expect(card?.className).toContain('sm:w-[clamp(100px,10vw,122px)]')
  })
})
