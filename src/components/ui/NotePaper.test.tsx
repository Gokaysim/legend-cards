import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { NotePaper } from './NotePaper'

describe('NotePaper', () => {
  it('names its field with its label, and passes what is typed on', async () => {
    const onChange = vi.fn()
    render(
      <NotePaper
        label="Kart notu"
        value=""
        isEditable
        onChange={onChange}
        placeholder="Bu kart için oyuncuya özel not"
      />,
    )

    const field = screen.getByRole('textbox', { name: 'Kart notu' })
    expect(field).toHaveAttribute('placeholder', 'Bu kart için oyuncuya özel not')
    await userEvent.type(field, 'A')
    expect(onChange).toHaveBeenCalledWith('A')
  })

  it('shows a read-only note as text, without a field', () => {
    render(<NotePaper label="Kart notu" value="Boss savaşında kullan" isEditable={false} />)

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('Kart notu')).toBeInTheDocument()
    expect(screen.getByText('Boss savaşında kullan')).toHaveClass('text-bubble-ink')
  })

  it('says "Not yok." for an empty read-only note', () => {
    render(<NotePaper label="Kart notu" value="" isEditable={false} />)

    expect(screen.getByText('Not yok.')).toHaveClass('text-bubble-ink-muted')
  })
})
