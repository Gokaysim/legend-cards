import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { testBlessedCard, testCard } from '@/test/cardFixtures'

import { FaceDownCard } from './FaceDownCard'

const eyes = testCard("Aboleth's Eyes", { text: 'See everything. [scry]' })
const wind = testBlessedCard('Second Wind')

describe('FaceDownCard', () => {
  it('shows a back that tells nothing about the card', () => {
    const { container, rerender } = render(<FaceDownCard card={eyes} position={1} tone="random" />)
    const back = screen.getByRole('button', { name: 'Kart 1: çevir' })

    expect(container).not.toHaveTextContent("Aboleth's Eyes")
    expect(container).not.toHaveTextContent('See everything')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()

    // A Blessed card has the very same back.
    const normalBack = back.outerHTML
    rerender(<FaceDownCard card={wind} position={1} tone="random" />)
    expect(screen.getByRole('button', { name: 'Kart 1: çevir' }).outerHTML).toBe(normalBack)
    expect(container).not.toHaveTextContent('Second Wind')
  })

  it('turns over to the face when selected, and stays revealed', async () => {
    const user = userEvent.setup()
    render(<FaceDownCard card={eyes} position={2} tone="random" />)

    await user.click(screen.getByRole('button', { name: 'Kart 2: çevir' }))

    const face = screen.getByRole('article', { name: "Aboleth's Eyes" })
    expect(face).toHaveTextContent('See everything.')
    expect(face).not.toHaveTextContent('[scry]')
    expect(screen.getByRole('group', { name: 'Kart 2' })).toHaveFocus()
    expect(screen.getByRole('button', { hidden: true, name: 'Kart 2: çevir' })).toBeDisabled()
  })

  it('marks a Cursed draw with the cursed back', () => {
    render(<FaceDownCard card={eyes} position={1} tone="cursed" />)

    const back = screen.getByRole('button', { name: 'Kart 1: çevir' })
    expect(back).toHaveClass('border-cursed')
    expect(back).toHaveTextContent('☠')
  })
})
