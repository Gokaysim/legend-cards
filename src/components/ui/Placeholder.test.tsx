import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { testArt } from '@/test/artFixtures'
import { TestArtProvider } from '@/test/TestArtProvider'

import { Placeholder } from './Placeholder'

describe('Placeholder', () => {
  it('shows the screen title, then a drifting card back, "Yakında" and the not-ready note', () => {
    render(<Placeholder title="Elixir Shop" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Elixir Shop' })).toBeInTheDocument()
    const soon = screen.getByRole('heading', { level: 2, name: 'Yakında' })
    expect(soon).toHaveClass('uppercase', 'text-gold')
    expect(soon).toHaveAttribute('lang', 'tr')
    expect(screen.getByText('Bu ekran henüz hazır değil.')).toBeInTheDocument()
    // The card is the neutral back of a random draw, as decoration.
    const card = document.querySelector('[data-coming-soon-card]')
    expect(card).toHaveTextContent('✦')
    expect(card?.querySelector('[aria-hidden="true"].border-gold')).not.toBeNull()
  })

  it('moves the card only where motion is welcome', () => {
    render(<Placeholder title="Elixir Shop" />)

    const card = document.querySelector('[data-coming-soon-card]')
    const drifting = card?.querySelector('.motion-safe\\:animate-card-drift')
    expect(drifting).toHaveClass('motion-reduce:-rotate-3')
    expect(card?.querySelector('[data-glint]')).toHaveClass(
      'opacity-0',
      'motion-safe:animate-back-glint',
    )
    expect(
      card?.querySelector('[class*="animate-"]:not([class*="motion-safe:animate-"])'),
    ).toBeNull()
  })

  it('shows no buttons or other controls', () => {
    render(<Placeholder title="Pack Shop" />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('shows the given header actions next to the title', () => {
    render(<Placeholder title="Elixir Shop" actions={<a href="/shops">← Shops</a>} />)

    const header = screen.getByRole('heading', { level: 1, name: 'Elixir Shop' }).closest('header')
    expect(header).not.toBeNull()
    expect(header).toContainElement(screen.getByRole('link', { name: '← Shops' }))
    expect(screen.getByText('Bu ekran henüz hazır değil.')).toBeInTheDocument()
  })

  it("shows the screen's Cardmaker in the header when it has a picture", () => {
    render(
      <TestArtProvider
        manifest={testArt({ mascots: { cardmaker_wave: '/art/mascots/wave.0123456789.webp' } })}
      >
        <Placeholder title="Kurallar" mascot="cardmaker_wave" />
        <Placeholder title="Elixir Shop" mascot="cardmaker_zaddir" />
      </TestArtProvider>,
    )

    const header = (name: string) =>
      screen.getByRole('heading', { level: 1, name }).closest('header')
    expect(header('Kurallar')?.querySelector('img')).toHaveAttribute(
      'src',
      '/art/mascots/wave.0123456789.webp',
    )
    expect(header('Elixir Shop')?.querySelector('img')).toBeNull()
  })
})
