import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EmptyCardSlot } from './EmptyCardSlot'
import { ToolSection } from './ToolSection'

describe('ToolSection', () => {
  it('names its group of controls with its heading', () => {
    render(
      <ToolSection title="DM araçları">
        <button type="button">At</button>
      </ToolSection>,
    )

    const section = screen.getByRole('region', { name: 'DM araçları' })
    expect(section).toContainElement(screen.getByRole('button', { name: 'At' }))
    expect(screen.getByRole('heading', { name: 'DM araçları' })).toBeInTheDocument()
  })
})

describe('EmptyCardSlot', () => {
  it('shows its title and hint in a dashed card-shaped box', () => {
    const { container } = render(
      <EmptyCardSlot
        title="Bir kart seç"
        hint="Elden bir karta tıkla, ayrıntıları burada görünsün."
      />,
    )

    expect(screen.getByText('Bir kart seç')).toBeInTheDocument()
    expect(
      screen.getByText('Elden bir karta tıkla, ayrıntıları burada görünsün.'),
    ).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('border-dashed', 'aspect-[563/788]')
  })
})
