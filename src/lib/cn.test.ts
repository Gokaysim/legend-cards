import { describe, expect, it } from 'vitest'

import { cn } from './cn'

describe('cn', () => {
  it('lets a later class win a Tailwind conflict', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('drops falsy values and keeps conditional classes', () => {
    const isActive = true
    const isHidden = false
    expect(cn('text-ink', isActive && 'text-gold', isHidden && 'hidden')).toBe('text-gold')
  })

  it('keeps classes that do not conflict', () => {
    expect(cn('bg-pane', 'text-ink')).toBe('bg-pane text-ink')
  })
})
