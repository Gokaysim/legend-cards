import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Placeholder } from './Placeholder'

describe('Placeholder', () => {
  it('shows the screen title and the not-ready note', () => {
    render(<Placeholder title="Cursed Deck" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Cursed Deck' })).toBeInTheDocument()
    expect(screen.getByText('Bu ekran henüz hazır değil.')).toBeInTheDocument()
  })

  it('shows no buttons or other controls', () => {
    render(<Placeholder title="Pack Shop" />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
