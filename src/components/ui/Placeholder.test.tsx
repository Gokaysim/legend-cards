import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { testArt } from '@/test/artFixtures'
import { TestArtProvider } from '@/test/TestArtProvider'

import { Placeholder } from './Placeholder'

describe('Placeholder', () => {
  it('shows the screen title and the not-ready note', () => {
    render(<Placeholder title="Custom Card Draft" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Custom Card Draft' })).toBeInTheDocument()
    expect(screen.getByText('Bu ekran henüz hazır değil.')).toBeInTheDocument()
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
        <Placeholder title="Custom Card Draft" mascot="cardmaker_custom" />
      </TestArtProvider>,
    )

    const header = (name: string) =>
      screen.getByRole('heading', { level: 1, name }).closest('header')
    expect(header('Kurallar')?.querySelector('img')).toHaveAttribute(
      'src',
      '/art/mascots/wave.0123456789.webp',
    )
    expect(header('Custom Card Draft')?.querySelector('img')).toBeNull()
  })
})
