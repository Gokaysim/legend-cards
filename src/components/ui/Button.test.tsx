import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './Button'

describe('Button', () => {
  it('defaults to a non-submitting secondary button', () => {
    render(<Button>Kaydet</Button>)
    const button = screen.getByRole('button', { name: 'Kaydet' })

    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveClass('bg-control')
  })

  it.each([
    ['primary', 'bg-primary'],
    ['ghost', 'bg-transparent'],
    ['danger', 'text-danger-ink'],
  ] as const)('applies the %s variant', (variant, expectedClass) => {
    render(<Button variant={variant}>Tamam</Button>)

    expect(screen.getByRole('button', { name: 'Tamam' })).toHaveClass(expectedClass)
  })

  it('lets a passed className override a conflicting default', () => {
    render(<Button className="px-6">Geniş</Button>)
    const button = screen.getByRole('button', { name: 'Geniş' })

    expect(button).toHaveClass('px-6')
    expect(button).not.toHaveClass('px-3')
  })

  it('calls onClick when clicked, but not when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick}>Aç</Button>)

    await user.click(screen.getByRole('button', { name: 'Aç' }))
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(
      <Button onClick={onClick} disabled>
        Aç
      </Button>,
    )
    await user.click(screen.getByRole('button', { name: 'Aç' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
