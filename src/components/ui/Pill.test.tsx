import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Pill } from './Pill'

describe('Pill', () => {
  it('draws a plain label without a tone', () => {
    render(<Pill>Kesqerian Nights</Pill>)

    expect(screen.getByText('Kesqerian Nights')).toHaveClass('border-line', 'text-ink')
  })

  it("changes only the border for a kind's tone", () => {
    render(
      <>
        <Pill>Plain</Pill>
        <Pill tone="rare">Rare</Pill>
        <Pill tone="cursed">Cursed</Pill>
      </>,
    )
    const classesOf = (text: string) => new Set(screen.getByText(text).classList)
    const plain = classesOf('Plain')

    for (const [text, border] of [
      ['Rare', 'border-gold'],
      ['Cursed', 'border-cursed'],
    ] as const) {
      const classes = classesOf(text)
      expect(classes.has(border)).toBe(true)
      expect([...classes].filter((name) => !plain.has(name))).toEqual([border])
    }
  })

  it('mutes a secondary label', () => {
    render(<Pill isMuted>Risk &amp; Reward</Pill>)

    expect(screen.getByText('Risk & Reward')).toHaveClass('text-ink-muted')
  })
})
