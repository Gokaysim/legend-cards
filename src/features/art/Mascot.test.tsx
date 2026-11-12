import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { testArt } from '@/test/artFixtures'
import { stubPhoneWidth } from '@/test/media'
import { TestArtProvider } from '@/test/TestArtProvider'

import { Mascot } from './Mascot'

afterEach(() => {
  vi.unstubAllGlobals()
})

const ART = testArt({ mascots: { cardmaker_lib: '/art/mascots/cardmaker_lib.0123456789.webp' } })

const renderMascot = (stem: string) =>
  render(
    <TestArtProvider manifest={ART}>
      <Mascot stem={stem} />
    </TestArtProvider>,
  )

const mascot = () => document.querySelector('[data-mascot]')

describe('Mascot', () => {
  it('shows the Cardmaker as decoration', () => {
    renderMascot('cardmaker_lib')

    expect(mascot()).toHaveAttribute('src', '/art/mascots/cardmaker_lib.0123456789.webp')
    expect(mascot()).toHaveAttribute('alt', '')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows nothing without a picture', () => {
    renderMascot('cardmaker_custom')

    expect(mascot()).toBeNull()
  })

  it('shows nothing on a phone', () => {
    stubPhoneWidth()
    renderMascot('cardmaker_lib')

    expect(mascot()).toBeNull()
  })
})
